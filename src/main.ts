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
    findNonce,
} from "./Encryption/Encryption";
import readline from "readline";
import { exit } from "process";

import SwarmNet from "./NodeNet/SwarmNet";

const node = new Node();

const keypair = genKeyPair();

process.stdin.on("data", () => {
    // node.createInitialTransaction(keypair, 12);

    const tx = new SignedTransaction({
        input: { from: keypair.publicKey },
        outputs: [{ to: keypair.publicKey, amount: 15 }],
    });
    tx.sign(keypair.privateKey);
    node.protocol.process(tx);
});

// console.log(JSON.parse(JSON.stringify([1, 2, 3, 4])));
