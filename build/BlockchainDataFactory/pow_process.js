"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var zod_1 = require("zod");
var IBlock_1 = require("./IBlock");
var Encryption_1 = require("src/Encryption/Encryption");
var ParentProcessMessage = zod_1.z
    .object({
    block: IBlock_1.BlockValidator,
    complexity: zod_1.z.number().refine(function (c) {
        return c >= 0 && c <= 32;
    }),
})
    .strict();
var nonce = 0;
var currentBlock = null;
var complexity = 32;
process.on("message", function (obj) {
    var messageValidation = ParentProcessMessage.safeParse(obj);
    if (messageValidation.success) {
        currentBlock = messageValidation.data.block;
        complexity = messageValidation.data.complexity;
        nonce = 0;
    }
    else {
        console.error("[pow worker]: bad message");
    }
});
setImmediate(mine);
setInterval(function () {
    console.log("mining...");
}, 4000);
function mine() {
    if (currentBlock) {
        currentBlock.payload.nonce = nonce;
        var serializedPayload = JSON.stringify(currentBlock.payload);
        var check = Encryption_1.hashSatisfiesComplexity(serializedPayload, complexity);
        if (check.success) {
            var blockHash = check.hash.toString("base64");
            currentBlock.header.hash = blockHash;
            sendProof(currentBlock);
            currentBlock = null;
        }
        else {
            ++nonce;
        }
    }
    setImmediate(mine);
}
function sendProof(block) {
    process.send({
        block: block,
        complexity: complexity,
    });
}
