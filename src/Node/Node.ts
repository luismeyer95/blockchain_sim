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
    private state: IBlockchainState;
    private protocol: INodeProtocol;
    private log: ILogger = log;

    constructor(
        state: IBlockchainState,
        protocol: INodeProtocol,
        logger: ILogger = log
    ) {
        this.state = state;
        this.protocol = protocol;
        this.log = logger;

        this.state.onLocalTransactionAppend((tx: unknown) => {
            const serial = JSON.stringify(tx);
            this.protocol.broadcast("tx", serial);
        });

        this.state.onLocalBlockAppend((block: unknown) => {
            const serial = JSON.stringify([block]);
            this.protocol.broadcast("blocks", serial);
        });

        this.protocol.onBroadcast(
            "blocks",
            (data: string, peer: string, relay: () => void) => {
                this.log(`[node]: received broadcasted block\n`);
                this.state.submitBlocks(data, {
                    onSuccess: () => {
                        this.log(`[node]: valid broadcasted block append\n`);
                        relay();
                    },
                    onError: (missing) => {
                        if (missing) {
                            this.log(
                                `[node]: missing blocks, requesting range\n`
                            );
                            this.onMissingBlocks(missing, peer);
                        } else {
                            this.log(`[node]: bad broadcasted block\n`);
                        }
                    },
                });
            }
        );

        this.protocol.onBroadcast(
            "tx",
            (data: string, peer: string, relay: () => void) => {
                this.log(`[node]: received broadcasted tx\n`);
                const obj = JSON.parse(data);
                this.state.addTransaction(data, {
                    onSuccess: () => {
                        this.log(`[node]: valid broadcasted tx append\n`);
                        relay();
                    },
                    onError: (message) => {
                        this.log(
                            `[node]: received bad transaction. cause: ${message}\n`
                        );
                    },
                });
            }
        );

        this.protocol.onBlocksRequest(
            (range: [number, number], peer: string, respond) => {
                const chain = this.state.getChainState();
                const blockRange = chain.slice(range[0], range[1] + 1);
                const serializedRange = JSON.stringify(blockRange);
                respond(serializedRange);
            }
        );
    }

    private onMissingBlocks = (range: [number, number], peer: string) => {
        this.protocol.requestBlocks(range, peer, (data: string) => {
            this.state.submitBlocks(data, {
                onSuccess: () => {},
                onError: () => {},
            });
        });
    };
}
