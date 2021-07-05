import INodeProtocol from "src/Interfaces/INodeProtocol";
import { BlockValidator, BlockType } from "src/Interfaces/IBlock";
import {
    AccountTransactionValidator,
    AccountTransactionType,
} from "src/Interfaces/IAccountTransaction";
import { BlockchainChecker } from "src/Blockchain/Blockchain";
import { z } from "zod";
import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";

const BlockArrayValidator = z.array(BlockValidator);

export class Node {
    private protocol: INodeProtocol;

    private chainChecker: BlockchainChecker = new BlockchainChecker();
    private chain: BlockType[];
    private log: ILogger = log;

    constructor(protocol: INodeProtocol, logger: ILogger) {
        this.protocol = protocol;
        this.log = logger;

        this.protocol.onBroadcast("blocks", (data: string, peer: string) => {
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
        });

        this.protocol.onBroadcast("tx", (data: string, peer: string) => {});

        this.protocol.onBlocksRequest(
            (range: [number, number], peer: string) => {
                const blockRange = this.chain.slice(range[0], range[1]);
                const serializedRange = JSON.stringify(blockRange);
                return serializedRange;
            }
        );
    }

    // TODO: maybe leave clue about validation success through logging
    private processReceivedBlocks(
        data: string
    ): null | { missing: [number, number] } {
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
