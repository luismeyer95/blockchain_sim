import { z } from "zod";
import { BlockType, BlockValidator } from "./IBlock";
import {
    hashSatisfiesComplexity,
    serializeKey,
} from "src/Encryption/Encryption";

const ParentProcessMessage = z
    .object({
        block: BlockValidator,
        complexity: z.number().refine((c) => {
            return c >= 0 && c <= 32;
        }),
    })
    .strict();

export type ParentProcessMessage = z.infer<typeof ParentProcessMessage>;

let nonce: number = 0;
let currentBlock: BlockType | null = null;
let complexity: number = 32;

process.on("message", (obj: unknown) => {
    const messageValidation = ParentProcessMessage.safeParse(obj);
    if (messageValidation.success) {
        currentBlock = messageValidation.data.block;
        complexity = messageValidation.data.complexity;
        nonce = 0;
    } else {
        console.error("[pow worker]: bad message");
    }
});

setImmediate(mine);

setInterval(() => {
    console.log("mining...");
}, 4000);

function mine() {
    if (currentBlock) {
        currentBlock.payload.nonce = nonce;
        const serializedPayload = JSON.stringify(currentBlock.payload);
        const check = hashSatisfiesComplexity(serializedPayload, complexity);
        if (check.success) {
            const blockHash = check.hash.toString("base64");
            currentBlock.header.hash = blockHash;
            sendProof(currentBlock);
            currentBlock = null;
        } else {
            ++nonce;
        }
    }
    setImmediate(mine);
}

function sendProof(block: BlockType) {
    process.send!({
        block,
        complexity,
    });
}
