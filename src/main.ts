import { KeyPairKeyObjectResult } from "crypto";
import crypto from "crypto";
import { Node } from "./Node/Node";
import {
    InitialTransaction,
    SignedTransaction,
} from "./Transactions/Transactions";
import {
    genKeyPair,
    sign,
    verify,
    hash,
    serializeKey,
} from "./Encryption/Encryption";
import readline from "readline";
import { exit } from "process";

import SwarmNet from "./NodeNet/SwarmNet";

import ProofWorker, { PowProcessMessage } from "src/BlockProofing/ProofWorker";
import { dec2bin } from "./utils";

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

const worker = new ProofWorker();

worker.updateTaskData("can i please get the coq por favor", 20);

const showNonce = (data: PowProcessMessage) => {
    console.log("~ FOUND GOLD NONCE! ~");
    console.log(data);
};

worker.once("pow", (data: PowProcessMessage) => {
    showNonce(data);
    worker.updateTaskData("ok", 21);
    worker.once("pow", showNonce);
});
