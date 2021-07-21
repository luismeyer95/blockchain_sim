import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import IBlockchainMiner from "src/Interfaces/IBlockchainMiner";
import {
    IBlockchainOperator,
    TransactionInfo,
} from "src/Interfaces/IBlockchainOperator";
import { BlockchainOperator } from "./BlockchainOperator";
import { AccountTransactionType } from "./IAccountTransaction";
import { BlockType, BlockValidator } from "./IBlock";
import { CustomSet } from "src/Utils/CustomSet";
import { z } from "zod";
import { ChildProcess, fork } from "child_process";
import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";
import {
    hashSatisfiesComplexity,
    serializeKey,
    deserializeKey,
} from "src/Encryption/Encryption";
import EventEmitter from "events";
import { AccountOperationType } from "./IAccountOperation";
import IBlockchainState from "src/Interfaces/IBlockchainState";
import { BlockchainState } from "./BlockchainState";

const deepEqual = require("deep-equal");

const PowProcessMessage = z
    .object({
        block: BlockValidator,
        complexity: z.number(),
    })
    .strict();

export type PowProcessMessage = z.infer<typeof PowProcessMessage>;

class DummyWorker extends EventEmitter {
    private nonce: number = 0;
    private currentBlock: BlockType | null = null;
    private complexity: number = 32;
    constructor() {
        super();
        setImmediate(this.mine.bind(this));
        setInterval(() => {
            console.log("mining...");
        }, 4000);
    }

    send(obj: { block: BlockType; complexity: number }) {
        this.currentBlock = obj.block;
        this.complexity = obj.complexity;
        this.nonce = 0;
    }

    mine() {
        if (this.currentBlock) {
            this.currentBlock.payload.nonce = this.nonce;
            const serializedPayload = JSON.stringify(this.currentBlock.payload);
            const check = hashSatisfiesComplexity(
                serializedPayload,
                this.complexity
            );
            if (check.success) {
                const blockHash = check.hash.toString("base64");
                this.currentBlock.header.hash = blockHash;
                this.emit("mined", {
                    block: this.currentBlock,
                    complexity: this.complexity,
                });
                this.currentBlock = null;
            } else {
                ++this.nonce;
            }
        }
        setImmediate(this.mine.bind(this));
    }
}

export class BlockchainMiner implements IBlockchainMiner {
    private keypair: KeyPairKeyObjectResult;
    private state: BlockchainState;
    private worker: DummyWorker | null = null;
    private log: ILogger;
    private events: EventEmitter = new EventEmitter();
    private operator: BlockchainOperator = new BlockchainOperator();

    constructor(
        keypair: KeyPairKeyObjectResult,
        state: BlockchainState,
        logger: ILogger = log
    ) {
        this.log = logger;
        this.keypair = keypair;
        this.state = state;
    }

    private updateMinedTemplateState = () => {
        // this.cleanupTxCache();
        if (!this.worker) return;
        const blockTemplate: BlockType = this.operator.createBlockTemplate(
            this.keypair,
            this.state.getChainState(),
            this.state.getTxPoolState()
        );
        // TODO: remove hardcoded complexity!!
        this.updateTaskData(blockTemplate, 19);
    };

    setMinerAccount(keypair: KeyPairKeyObjectResult) {
        this.keypair = keypair;
        if (this.worker) {
            this.stopMining();
            this.startMining();
        }
    }

    startMining(): void {
        if (this.worker) throw new Error("worker is already mining");
        this.worker = new DummyWorker();
        this.worker.on(
            "mined",
            (obj: { block: BlockType; complexity: number }) => {
                this.events.emit("mined block", obj.block);
            }
        );
        this.updateMinedTemplateState();
        this.state.on("change", this.updateMinedTemplateState);
    }

    private killMinerProcess() {
        if (this.worker) {
            this.worker.removeAllListeners();
            this.worker = null;
        }
    }

    private updateTaskData(block: BlockType, complexity: number): void {
        if (!this.worker) return;
        this.worker.send({
            block,
            complexity,
        });
    }

    stopMining(): void {
        this.killMinerProcess();
        this.state.removeAllListeners();
    }

    onMinedBlock(fn: (block: BlockType) => void): void {
        this.events.on("mined block", fn);
    }
}

// export class BlockchainMiner implements IBlockchainMiner {
//     private keypair: KeyPairKeyObjectResult;
//     private state: BlockchainState;
//     private worker: ChildProcess | null = null;
//     private log: ILogger;
//     private events: EventEmitter = new EventEmitter();
//     private operator: BlockchainOperator = new BlockchainOperator();

//     constructor(
//         keypair: KeyPairKeyObjectResult,
//         state: BlockchainState,
//         logger: ILogger = log
//     ) {
//         this.log = logger;
//         this.keypair = keypair;
//         this.state = state;

//         process.on("exit", () => {
//             this.killMinerProcess();
//         });
//     }

//     private updateMinedTemplateState = () => {
//         // this.cleanupTxCache();
//         if (!this.worker) return;
//         const blockTemplate: BlockType = this.operator.createBlockTemplate(
//             this.keypair,
//             this.state.getTxPoolState(),
//             this.state.getChainState()
//         );
//         // TODO: remove hardcoded complexity!!
//         this.updateTaskData(blockTemplate, 19);
//     };

//     setMinerAccount(keypair: KeyPairKeyObjectResult) {
//         this.keypair = keypair;
//         if (this.worker) {
//             this.stopMining();
//             this.startMining();
//         }
//     }

//     startMining(): void {
//         if (this.worker) throw new Error("worker is already mining");
//         this.worker = fork("./src/BlockchainDataFactory/pow_process.ts", [], {
//             // execArgv: ["--inspect-brk=14321", "-r", "ts-node/register"],
//             execArgv: ["-r", "ts-node/register"],
//         });
//         this.worker.on("message", (msg: unknown) => {
//             const messageValidation = PowProcessMessage.safeParse(msg);
//             if (messageValidation.success) {
//                 this.events.emit("mined block", messageValidation.data.block);
//             } else {
//                 console.log("[pow parent]: bad worker response");
//             }
//         });
//         this.updateMinedTemplateState();
//         this.state.on("change", this.updateMinedTemplateState);
//     }

//     private killMinerProcess() {
//         if (this.worker) {
//             this.worker.removeAllListeners();
//             this.worker.kill("SIGINT");
//         }
//         this.worker = null;
//     }

//     private updateTaskData(block: BlockType, complexity: number): void {
//         if (!this.worker) return;
//         this.worker.send({
//             block,
//             complexity,
//         });
//     }

//     stopMining(): void {
//         this.killMinerProcess();
//         this.state.removeAllListeners();
//     }

//     onMinedBlock(fn: (block: BlockType) => void): void {
//         this.events.on("mined block", fn);
//     }
// }
