"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Encryption_1 = require("src/Encryption/Encryption");
var zod_1 = require("zod");
var ParentProcessMessage = zod_1.z.object({
    data: zod_1.z.string(),
    complexity: zod_1.z.number().refine(function (c) {
        return c >= 0 && c <= 32;
    }),
});
var nonce = 0;
var currentData = null;
var complexity = 32;
process.on("message", function (msg) {
    var obj = JSON.parse(msg);
    var messageValidation = ParentProcessMessage.safeParse(obj);
    if (messageValidation.success) {
        currentData = messageValidation.data.data;
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
    if (currentData) {
        var checkNonce = Encryption_1.isNonceGold(nonce, currentData, complexity);
        if (checkNonce.success) {
            sendProof();
            currentData = null;
        }
        else {
            ++nonce;
        }
    }
    setImmediate(mine);
}
function sendProof() {
    process.send({
        data: currentData,
        complexity: complexity,
        nonce: nonce,
    });
}
