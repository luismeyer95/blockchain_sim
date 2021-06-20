import { isNonceGold } from "src/Encryption/Encryption";
import { z } from "zod";

const ParentProcessMessage = z.object({
    data: z.string(),
    complexity: z.number().refine((c) => {
        return c >= 0 && c <= 32;
    }),
});

export type ParentProcessMessage = z.infer<typeof ParentProcessMessage>;

let nonce: number = 0;
let currentData: string | null = null;
let complexity: number = 32;

setImmediate(mine);

setInterval(() => {
    console.log("mining...");
}, 4000);

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

function sendProof() {
    process.send!({
        data: currentData,
        complexity,
        nonce,
    });
    // process.exit(0);
}

function mine() {
    if (currentData) {
        const checkNonce = isNonceGold(nonce, currentData, complexity);
        if (checkNonce.success) {
            sendProof();
            currentData = null;
        } else {
            ++nonce;
        }
    }
    setImmediate(mine);
}
