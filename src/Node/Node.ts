import INodeProtocol from "src/Interfaces/INodeProtocol";
import { BlockValidator, BlockType } from "src/BlockchainDataFactory/IBlock";
import {
    AccountTransactionValidator,
    AccountTransactionType,
} from "src/BlockchainDataFactory/IAccountTransaction";
import { BlockchainOperator } from "src/BlockchainDataFactory/BlockchainOperator";
import { z } from "zod";
import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";
import IBlockchainDataFactory from "src/Interfaces/IBlockchainDataFactory";
import {
    IBlockchainOperator,
    TransactionInfo,
} from "src/Interfaces/IBlockchainOperator";

import IBlockchainMiner from "src/Interfaces/IBlockchainMiner";
import IBlockchainWallet from "src/Interfaces/IBlockchainWallet";
import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import IBlockchainState from "src/Interfaces/IBlockchainState";

export class Node {
    private protocol: INodeProtocol;
    private factory: IBlockchainDataFactory;
    private chainOperator: IBlockchainOperator;
    private chain: unknown[];
    private state: IBlockchainState;
    private log: ILogger = log;

    constructor(
        factory: IBlockchainDataFactory,
        protocol: INodeProtocol,
        logger: ILogger = log
    ) {
        this.state = factory.createStateInstance();
        this.chainOperator = factory.createChainOperatorInstance();
        this.factory = factory;
        this.protocol = protocol;
        this.log = logger;

        const BlockValidator = this.factory.getBlockShapeValidator();

        this.protocol.onBroadcast(
            "blocks",
            (data: string, peer: string, relay) => {
                const res = this.processReceivedBlocks(data);
                if (res?.missing) {
                    this.protocol.requestBlocks(
                        res.missing,
                        peer,
                        (data: string) => {
                            this.processReceivedBlocks(data);
                        }
                    );
                }
            }
        );

        this.protocol.onBroadcast(
            "tx",
            (data: string, peer: string, relay: () => void) => {
                try {
                    const tx = JSON.parse(data);
                    this.processReceivedTransaction(tx, relay);
                } catch (err) {
                    this.log(
                        `[node]: received bad transaction shape (broadcast)\n`
                    );
                }
            }
        );

        this.protocol.onBlocksRequest(
            (range: [number, number], peer: string, respond) => {
                const chain = this.state.getChainState();
                const blockRange = chain.slice(range[0], range[1]);
                const serializedRange = JSON.stringify(blockRange);
                respond(serializedRange);
            }
        );
    }

    // TODO: maybe leave clue about validation success through logging
    private processReceivedBlocks(
        data: string
    ): null | { missing: [number, number] } {
        const BlockArrayValidator = z.array(
            this.factory.getBlockShapeValidator()
        );
        const chain = this.state.getChainState();

        const obj = JSON.parse(data);
        const blockArrayValidation = BlockArrayValidator.safeParse(obj);
        if (blockArrayValidation.success) {
            const rangeValidation = this.chainOperator.validateBlockRange(
                chain,
                blockArrayValidation.data
            );
            if (
                rangeValidation.success &&
                rangeValidation.chain.length > chain.length
            )
                this.state.setChainState(rangeValidation.chain);
            else if (
                rangeValidation.success === false &&
                rangeValidation.missing
            )
                return { missing: rangeValidation.missing };
        }
        return null;
    }

    private processReceivedTransaction(
        tx: unknown,
        onSuccess: () => void = () => {}
    ) {
        const TransactionValidator =
            this.factory.getTransactionShapeValidator();
        const txShapeValidation = TransactionValidator.safeParse(tx);
        if (!txShapeValidation.success) return;
        const txValidation = this.state.addTransaction(tx);
        if (txValidation.success && onSuccess) onSuccess();
        else if (!txValidation.success)
            this.log(`[node]: bad transaction data, rejected\n`);
    }

    createWallet(keypair: KeyPairKeyObjectResult): IBlockchainWallet {
        const wallet = this.factory.createWalletInstance(keypair, this.state);
        wallet.onTransaction((tx: unknown) => {
            const successCallback = () => {
                const txSerial = JSON.stringify(tx);
                this.protocol.broadcast("tx", txSerial);
            };
            this.processReceivedTransaction(tx, successCallback);
        });
        return wallet;
    }

    createMiner(keypair: KeyPairKeyObjectResult): IBlockchainMiner {
        const miner = this.factory.createMinerInstance(keypair, this.state);
        const BlockValidator = this.factory.getBlockShapeValidator();
        miner.onMinedBlock((block: unknown) => {
            const blockShapeValidation = BlockValidator.safeParse(block);
            if (!blockShapeValidation.success) return;
            const chain = this.state.getChainState();
            const blockValidation = this.chainOperator.validateBlockRange(
                chain,
                [blockShapeValidation.data]
            );
            if (
                blockValidation.success &&
                blockValidation.chain.length > chain.length
            ) {
                console.log("~ BLOCK WAS MINED :) ~");
                this.state.setChainState(blockValidation.chain);
            } else {
                console.log("~ BAD BLOCK, REJECTION MOMENT :( ~");
                process.exit(0);
            }
        });
        return miner;
    }
}
