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

// this.pendingTransactions.sort((a, b) => b.timestamp - a.timestamp);

const arr = [0, 1, 94, 3, 2, 7, 12, 32, 76];

console.log(arr.sort((a, b) => b - a));
