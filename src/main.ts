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

// import SwarmNet from "./NodeNet/SwarmNet";
import ChatP2P from "./Network/ChatP2P";

const swarm = new ChatP2P();
process.stdin.on("data", swarm.getDataHook());
