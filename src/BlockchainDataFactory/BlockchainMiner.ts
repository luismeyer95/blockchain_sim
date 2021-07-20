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
import { serializeKey, deserializeKey } from "src/Encryption/Encryption";
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

export class BlockchainMiner implements IBlockchainMiner {
    private keypair: KeyPairKeyObjectResult;
    private state: BlockchainState;
    private worker: ChildProcess | null = null;
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

        process.on("exit", () => {
            this.killMinerProcess();
        });
    }

    // private filterValidTransactions(txs: AccountTransactionType[]) {
    //     return txs.filter((tx, index) => {
    //         const txPool = this.txCache.getArray().slice(0, index);
    //         const result = this.operator.validateTransaction(
    //             this.chain,
    //             tx,
    //             txPool
    //         );
    //         return result.success;
    //     });
    // }

    // private cleanupTxCache() {
    //     const txs = this.txCache.getArray();
    //     const validTxs = this.filterValidTransactions(txs);
    //     this.txCache.fromArray(validTxs);
    // }

    private updateMinedTemplateState = () => {
        // this.cleanupTxCache();
        if (!this.worker) return;
        const blockTemplate: BlockType = this.operator.createBlockTemplate(
            this.keypair,
            this.state.getTxPoolState(),
            this.state.getChainState()
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
        if (!this.keypair)
            throw new Error("cannot mine without a miner keypair");
        this.worker = fork("./src/BlockchainDataFactory/pow_process.ts", [], {
            execArgv: ["-r", "ts-node/register"],
        });
        this.worker.on("message", (msg: unknown) => {
            const messageValidation = PowProcessMessage.safeParse(msg);
            if (messageValidation.success) {
                this.events.emit("mined block", messageValidation.data.block);
            } else {
                console.log("[pow parent]: bad worker response");
            }
        });
        this.updateMinedTemplateState();
        this.state.on("change", this.updateMinedTemplateState);
    }

    private killMinerProcess() {
        if (this.worker) {
            this.worker.removeAllListeners();
            this.worker.kill("SIGINT");
        }
        this.worker = null;
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
