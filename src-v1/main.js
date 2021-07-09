"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ProofWorker_1 = __importDefault(require("src/BlockProofing/ProofWorker"));
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
var worker = new ProofWorker_1.default();
worker.updateTaskData("can i please get the coq por favor", 20);
var showNonce = function (data) {
    console.log("~ FOUND GOLD NONCE! ~");
    console.log(data);
};
worker.once("pow", function (data) {
    showNonce(data);
    worker.updateTaskData("okko", 21);
    worker.once("pow", showNonce);
});
