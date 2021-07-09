"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BlockchainMiner_1 = require("./BlockchainDataFactory/BlockchainMiner");
var Encryption_1 = require("./Encryption/Encryption");
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
var kp = Encryption_1.genKeyPair();
var miner = new BlockchainMiner_1.BlockchainMiner();
miner.onMinedBlock(function (block) {
    console.log("~ BLOCK WAS MINED :) ~");
    console.log(block);
});
miner.startMining(kp);
