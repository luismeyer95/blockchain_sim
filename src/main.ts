import { KeyPairKeyObjectResult } from "crypto";
import crypto from "crypto";
import { Node } from "./Node/Node";
import { SignedTransaction } from "./Transactions/Transactions";
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

///
// const account1 = genKeyPair();
// const account2 = genKeyPair();
// const node = new Node(account1);

// node.mineBlock();

// const tx = new SignedTransaction({
//     input: { from: account1.publicKey },
//     outputs: [{ to: account2.publicKey, amount: 3 }],
// });

// node.createSignedTransaction(tx, account1.privateKey);

// node.mineBlock();

// node.printBlockchain();
