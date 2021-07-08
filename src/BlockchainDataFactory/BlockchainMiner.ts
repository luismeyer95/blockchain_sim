import { KeyPairKeyObjectResult } from "crypto";
import IBlockchainMiner from "src/Interfaces/IBlockchainMiner";
import { IBlockchainOperator } from "src/Interfaces/IBlockchainOperator";
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
const deepEqual = require("deep-equal");

const PowProcessMessage = z
    .object({
        block: BlockValidator,
        complexity: z.number(),
    })
    .strict();

export type PowProcessMessage = z.infer<typeof PowProcessMessage>;

export class BlockchainMiner implements IBlockchainMiner {
    private txCache: CustomSet<AccountTransactionType> =
        new CustomSet<AccountTransactionType>((a, b) => {
            return a.header.signature === b.header.signature;
        });

    private keypair: KeyPairKeyObjectResult;
    private chain: BlockType[] = [];
    private worker: ChildProcess | null = null;
    private log: ILogger;
    private events: EventEmitter = new EventEmitter();
    private operator: BlockchainOperator = new BlockchainOperator();
    private updateInterval: ReturnType<typeof setInterval> | null = null;

    constructor(keypair: KeyPairKeyObjectResult, logger: ILogger = log) {
        this.keypair = keypair;
        this.log = logger;
    }

    // adds a tx to the cached txs, to be included inside the block.
    addTransaction(tx: AccountTransactionType): void {
        if (this.operator.validateTransaction(this.chain, tx))
            this.txCache.add(tx);
    }

    // updates the local chain state by only replacing/processing blocks
    // that changed (tx cache updates only consider changed blocks)
    // TODO: could benefit from optimizations if ever needed
    setChainState(chain: BlockType[]) {
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
            this.removeBlockTransactionsFromTxCache(block);
        });
        this.chain.splice(
            changeIndex,
            this.chain.length - changeIndex,
            ...chainToAppend
        );
    }

    private removeBlockTransactionsFromTxCache(block: BlockType) {
        block.payload.txs.forEach((tx) => {
            this.txCache.delete(tx);
        });
    }

    startMining(keypair: KeyPairKeyObjectResult): void {
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
        this.updateInterval = setInterval(() => {
            const blockTemplate: BlockType = this.operator.createBlockTemplate(
                this.keypair,
                this.txCache.getArray(),
                this.chain
            );
            // TODO: remove hardcoded complexity!!
            this.updateTaskData(blockTemplate, 23);
        }, 1000);
    }

    private updateTaskData(block: BlockType, complexity: number): void {
        if (!this.worker) return;
        this.worker.send({
            block,
            complexity,
        });
    }

    stopMining(): void {
        this.worker?.kill("SIGINT");
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = null;
    }

    onMinedBlock(fn: (block: BlockType) => void): void {
        this.events.on("mined block", fn);
    }
}
