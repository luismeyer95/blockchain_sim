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
import IBlockchainWallet from "src/Interfaces/IBlockchainMiner";
import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import IBlockchainState from "src/Interfaces/IBlockchainState";

export class Node {
    private protocol: INodeProtocol;
    private factory: IBlockchainDataFactory;
    private chainOperator: IBlockchainOperator;
    private chain: unknown[];
    private state: IBlockchainState;
    private log: ILogger = log;

    private miners: IBlockchainMiner[] = [];
    private wallets: IBlockchainWallet[] = [];

    constructor(
        factory: IBlockchainDataFactory,
        protocol: INodeProtocol,
        logger: ILogger
    ) {
        this.state = factory.createStateInstance();
        this.chainOperator = factory.createChainOperatorInstance();
        this.factory = factory;
        this.protocol = protocol;
        this.log = logger;

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
            (data: string, peer: string, relay) => {}
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

    createWallet(keypair: KeyPairKeyObjectResult) {
        const wallet = this.factory.createWalletInstance(keypair, this.state);
        const TransactionValidator =
            this.factory.getTransactionShapeValidator();
        wallet.onTransaction((tx: unknown) => {
            const txShapeValidation = TransactionValidator.safeParse(tx);
            if (txShapeValidation.success) {
                const tx = txShapeValidation.data;
                const txValidation = this.state.addTransaction(tx);
                if (txValidation.success)
                    this.protocol.broadcast("tx", JSON.stringify(tx));
                else this.log(`[node]: bad transaction data, rejected\n`);
            }
        });
        return wallet;
    }

    createMiner(keypair: KeyPairKeyObjectResult) {
        const miner = this.factory.createMinerInstance(keypair, this.state);
    }
}
