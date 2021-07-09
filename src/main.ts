import { NodeNet } from "src/Net/NodeNet";
import { NodeProtocol } from "src/Protocol/NodeProtocol";
import INodeProtocol from "src/Interfaces/INodeProtocol";
import { stdin } from "process";
import { BlockchainMiner } from "./BlockchainDataFactory/BlockchainMiner";
import { BlockchainOperator } from "./BlockchainDataFactory/BlockchainOperator";
import {
    deserializeKey,
    deserializeKeyPair,
    genKeyPair,
    serializeKey,
    serializeKeyPair,
    sign,
    verify,
} from "./Encryption/Encryption";
import { BlockType } from "./BlockchainDataFactory/IBlock";

// const ptcl: INodeProtocol = new NodeProtocol(log, new NodeNet(log));

// ptcl.onBroadcast("cock", (data, peer, relay) => {
//     if (data.trim() === "pussy") {
//         console.log("relayed!");
//         relay();
//     }
// });

// stdin.on("data", (buf: Buffer) => {
//     ptcl.broadcast("cock", buf.toString());
// });

////////////////

let chain: BlockType[] = [];
const kp = genKeyPair();
const miner = new BlockchainMiner();
const operator = new BlockchainOperator();
miner.onMinedBlock((block) => {
    console.log("~ BLOCK WAS MINED :) ~");
    const prettyJson = JSON.stringify(block, null, 2);
    console.log(prettyJson);

    const blockValidation = operator.validateBlockRange(chain, [block]);
    if (blockValidation.success) {
        chain = blockValidation.chain;
    } else {
        console.log("~ BAD BLOCK :( ~");
        // console.log(`error: ${blockValidation.missing}`)
        process.exit(1);
    }
    miner.setChainState(chain);
});
miner.startMining(kp);

/////////////////////

// let kp = genKeyPair();
// let data = Buffer.from(JSON.stringify({ hello: "world" }));
// let sigBuf = sign(data, kp.privateKey);

// let sigSerial = sigBuf.toString("base64");
// let pubKeySerial = serializeKey(kp.publicKey);

// sigBuf = Buffer.from(sigSerial, "base64");
// let pubKey = deserializeKey(pubKeySerial, "public");
// console.log(verify(data, pubKey, sigBuf));
