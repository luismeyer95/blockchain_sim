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
var currentData = "bonjour";
var complexity = 32;
setImmediate(mine);
setInterval(function () {
    console.log("mining...");
}, 2000);
process.on("message", function (msg) {
    var messageValidation = ParentProcessMessage.safeParse(msg);
    if (messageValidation.success) {
        currentData = messageValidation.data.data;
        complexity = messageValidation.data.complexity;
    }
    else {
        console.error("[pow worker]: bad message");
    }
});
function mine() {
    if (currentData) {
        if (testHash(nonce, currentData, complexity)) {
            process.send(nonce);
            currentData = null;
        }
        else {
            nonce++;
        }
    }
    setImmediate(mine);
}
function testHash(nonce, strdata, leadingZeroBits) {
    if (leadingZeroBits < 0 || leadingZeroBits > 32)
        throw new Error("findNonce error: invalid leadingZeroBits argument");
    process.stdout.write(".");
    var bitnum = ~(1 << (31 - leadingZeroBits));
    var hashRes = Encryption_1.hash(Buffer.from(strdata));
    var buf = hashRes.copy().digest();
    var u32 = buf.readUInt32BE();
    return !(u32 & bitnum);
}
