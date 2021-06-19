"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Encryption_1 = require("./Encryption/Encryption");
// const node = new Node();
// const keypair = genKeyPair();
// process.stdin.on("data", () => {
//     node.createInitialTransaction(keypair, 12);
//     const tx = new SignedTransaction({
//         input: { from: keypair.publicKey },
//         outputs: [{ to: keypair.publicKey, amount: 15 }],
//     });
//     tx.sign(keypair.privateKey);
//     node.protocol.process(tx);
// });
// const worker = new ProofWorker();
// worker.updateTaskData("hello world", 16);
// worker.on("pow", (data: PowProcessMessage) => {
//     console.log(data);
// });
function testHash(nonce, strdata, leadingZeroBits) {
    if (leadingZeroBits <= 0 || leadingZeroBits > 32)
        throw new Error("error: invalid leading zero bits argument");
    var shift = 1 << (32 - leadingZeroBits);
    var bitnum = ~(shift - 1);
    console.log(dec2bin(bitnum));
    var hashRes = Encryption_1.hash(Buffer.from(strdata));
    var buf = hashRes.copy().digest();
    var u32 = buf.readUInt32BE();
    return !(u32 & bitnum);
}
function dec2bin(dec) {
    return (dec >>> 0).toString(2);
}
testHash(1234, "1234", 1);
