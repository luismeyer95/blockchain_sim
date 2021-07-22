import IBlockchainState from "src/Interfaces/IBlockchainState";
import {
    AccountTransactionType,
    AccountTransactionValidator,
} from "./IAccountTransaction";
import { BlockType, BlockValidator } from "./IBlock";
import { CustomSet } from "src/Utils/CustomSet";
import { BlockchainOperator } from "./BlockchainOperator";
import EventEmitter from "events";
import { BlockchainStorage } from "src/BlockchainDataFactory/BlockchainStorage";
import { z } from "zod";
import { SuccessErrorCallbacks } from "src/Utils/SuccessErrorCallbacks";
import { KeyPairKeyObjectResult } from "crypto";
import IBlockchainDataFactory from "src/Interfaces/IBlockchainDataFactory";
import IBlockchainMiner from "src/Interfaces/IBlockchainMiner";
import IBlockchainWallet from "src/Interfaces/IBlockchainWallet";
import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";

const storage = new BlockchainStorage();

export class BlockchainState extends EventEmitter implements IBlockchainState {
    private operator: BlockchainOperator = new BlockchainOperator();
    private events: EventEmitter = new EventEmitter();
    private txpool: AccountTransactionType[] = [];
    private chain: BlockType[] = [];
    private log: ILogger = log;

    constructor() {
        super();
    }

    getChainState(): BlockType[] {
        return this.chain;
    }

    getTxPoolState(): AccountTransactionType[] {
        return this.txpool;
    }

    onLocalBlockAppend(fn: (block: unknown) => unknown) {
        this.events.on("block", fn);
    }

    onLocalTransactionAppend(fn: (tx: unknown) => unknown) {
        this.events.on("tx", fn);
    }

    createWallet<Wallet extends IBlockchainWallet>(
        keypair: KeyPairKeyObjectResult,
        walletCtor: new (
            keypair: KeyPairKeyObjectResult,
            state: BlockchainState
        ) => Wallet
    ): IBlockchainWallet {
        const wallet = new walletCtor(keypair, this);
        wallet.onTransaction((tx: AccountTransactionType) => {
            this.addTransaction(tx, {
                onSuccess: () => {
                    this.events.emit("tx", tx);
                },
                onError: () => {},
            });
        });
        return wallet;
    }

    createMiner<Miner extends IBlockchainMiner>(
        keypair: KeyPairKeyObjectResult,
        minerCtor: new (
            keypair: KeyPairKeyObjectResult,
            state: BlockchainState
        ) => Miner
    ): IBlockchainMiner {
        const miner = new minerCtor(keypair, this);
        miner.onMinedBlock((block: unknown) => {
            const blockShapeValidation = BlockValidator.safeParse(block);
            if (!blockShapeValidation.success) return;
            const chain = this.getChainState();
            this.operator.validateBlockRange(
                chain,
                [blockShapeValidation.data],
                {
                    onSuccess: (resultChain) => {
                        if (resultChain.length > this.chain.length) {
                            console.log("~ BLOCK WAS MINED :) ~");
                            this.setChainState(resultChain);
                            this.events.emit("block", block);
                        }
                    },
                    onError: (missing) => {
                        console.log("~ BAD BLOCK, REJECTION MOMENT :( ~");
                    },
                }
            );
        });
        return miner;
    }

    // adds a tx to the cached txs, to be included inside the block.
    addTransaction(
        input: unknown | string,
        callbacks: SuccessErrorCallbacks<void, string>
    ) {
        try {
            this.tryAddTransaction(input, callbacks);
        } catch (err) {
            callbacks.onError("bad serial");
        }
    }

    private tryAddTransaction(
        input: unknown | string,
        callbacks: SuccessErrorCallbacks<void, string>
    ): void {
        let obj: unknown = input;
        if (typeof input === "string") {
            obj = JSON.parse(input);
        }
        const txShapeValidation = AccountTransactionValidator.safeParse(obj);
        if (!txShapeValidation.success) {
            callbacks.onError("bad object shape");
            return;
        }
        const tx = txShapeValidation.data;
        this.operator.validateTransaction(tx, this.chain, this.txpool, {
            onSuccess: () => {
                this.txpool.push(tx);
                this.emit("change");
                callbacks.onSuccess();
            },
            onError: callbacks.onError,
        });
    }

    submitBlocks(
        input: unknown | string,
        callbacks: SuccessErrorCallbacks<BlockType[], [number, number] | null>
    ): void {
        try {
            this.trySubmitBlocks(input, callbacks);
        } catch (err) {
            callbacks.onError(null);
        }
    }

    private trySubmitBlocks(
        input: unknown | string,
        callbacks: SuccessErrorCallbacks<BlockType[], [number, number] | null>
    ): void {
        const BlockArrayValidator = z.array(BlockValidator);

        let obj: unknown = input;
        if (typeof input === "string") {
            obj = JSON.parse(input);
        }
        const blockArrayShapeValidation = BlockArrayValidator.safeParse(obj);
        if (blockArrayShapeValidation.success) {
            const blocks = blockArrayShapeValidation.data;

            this.operator.validateBlockRange(this.chain, blocks, {
                onSuccess: (resultChain) => {
                    if (resultChain.length > this.chain.length)
                        this.setChainState(resultChain);
                    callbacks.onSuccess(resultChain);
                },
                onError: callbacks.onError,
            });
        } else callbacks.onError(null);
    }

    // updates the chain state and updates the transaction
    // cache to remove the ones that are included inside the blocks
    // that changed
    setChainState(chain: BlockType[]): void {
        const firstChangingBlock: BlockType | undefined = chain.find(
            (block, index) => {
                if (index >= this.chain.length) return true;
                const localBlock = this.chain[index];
                return localBlock.header.hash !== block.header.hash;
            }
        );
        if (!firstChangingBlock) return;
        const changeIndex = firstChangingBlock.payload.index;
        const chainToAppend = chain.slice(changeIndex);
        chainToAppend.forEach((block) => {
            this.removeBlockTransactionsFromTxPool(block);
        });
        this.chain.splice(
            changeIndex,
            this.chain.length - changeIndex,
            ...chainToAppend
        );
        this.emit("change");
        storage.saveBlockchain(this.chain);
    }

    private removeBlockTransactionsFromTxPool(block: BlockType) {
        this.txpool = this.txpool.filter((tx) => {
            const found = block.payload.txs.find(
                (btx) => btx.header.signature === tx.header.signature
            );
            return !found;
        });
    }
}
