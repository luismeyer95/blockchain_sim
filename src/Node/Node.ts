import INodeProtocol from "src/Interfaces/INodeProtocol";
import { BlockValidator, BlockType } from "src/BlockchainDataFactory/IBlock";
import {
    AccountTransactionValidator,
    AccountTransactionType,
} from "src/BlockchainDataFactory/IAccountTransaction";
import { BlockchainChecker } from "src/BlockchainDataFactory/BlockchainChecker";
import { z } from "zod";
import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";
import IBlockchainDataFactory from "src/Interfaces/IBlockchainDataFactory";
import IBlockchainChecker from "src/Interfaces/IBlockchainChecker";

export class Node {
    private protocol: INodeProtocol;
    private factory: IBlockchainDataFactory;
    private chainChecker: IBlockchainChecker;
    private chain: unknown[];
    private log: ILogger = log;

    constructor(
        factory: IBlockchainDataFactory,
        protocol: INodeProtocol,
        logger: ILogger
    ) {
        this.factory = factory;
        this.protocol = protocol;
        this.log = logger;
        this.chainChecker = this.factory.createChainCheckerInstance();

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
                const blockRange = this.chain.slice(range[0], range[1]);
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

        const obj = JSON.parse(data);
        const blockArrayValidation = BlockArrayValidator.safeParse(obj);
        if (blockArrayValidation.success) {
            const rangeValidation = this.chainChecker.validateBlockRange(
                this.chain,
                blockArrayValidation.data
            );
            if (
                rangeValidation.success &&
                rangeValidation.chain.length > this.chain.length
            )
                this.chain = rangeValidation.chain;
            else if (
                rangeValidation.success === false &&
                rangeValidation.missing
            )
                return { missing: rangeValidation.missing };
        }
        return null;
    }
}
