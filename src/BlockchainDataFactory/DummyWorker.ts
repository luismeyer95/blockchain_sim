import { BlockType, BlockValidator } from "./IBlock";
import { hashSatisfiesComplexity } from "src/Encryption/Encryption";
import EventEmitter from "events";

export class DummyWorker extends EventEmitter {
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
