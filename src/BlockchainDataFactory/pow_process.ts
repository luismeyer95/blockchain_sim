import { z } from "zod";
import { BlockType, BlockValidator } from "./IBlock";
import {
    hashSatisfiesComplexity,
    serializeKey,
} from "src/Encryption/Encryption";

const ParentProcessMessage = z.object({
    data: BlockValidator,
    complexity: z.number().refine((c) => {
        return c >= 0 && c <= 32;
    }),
});

export type ParentProcessMessage = z.infer<typeof ParentProcessMessage>;

let nonce: number = 0;
let currentData: BlockType | null = null;
let complexity: number = 32;

process.on("message", (msg: string) => {
    const obj: unknown = JSON.parse(msg);
    const messageValidation = ParentProcessMessage.safeParse(obj);
    if (messageValidation.success) {
        currentData = messageValidation.data.data;
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
    if (currentData) {
        currentData.payload.nonce = nonce;
        const serializedBlock = JSON.stringify(currentData);
        const check = hashSatisfiesComplexity(serializedBlock, complexity);
        if (check.success) {
            sendProof();
            currentData = null;
        } else {
            ++nonce;
        }
    }
    setImmediate(mine);
}

function sendProof() {
    process.send!({
        data: currentData,
        complexity,
        nonce,
    });
}
