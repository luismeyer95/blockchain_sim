"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var NodeNet_1 = require("src/Net/NodeNet");
var NodeProtocol_1 = require("src/Protocol/NodeProtocol");
var Encryption_1 = require("src/Encryption/Encryption");
var Node_1 = require("src/Node/Node");
var BlockchainDataFactory_1 = __importDefault(require("./BlockchainDataFactory/BlockchainDataFactory"));
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
// const storage: IBlockchainStorage = new BlockchainStorage();
// let chain: BlockType[] = storage.loadBlockchain() as BlockType[];
// let kp = storage.loadAccount("main");
// const miner = new BlockchainMiner();
// const operator = new BlockchainOperator();
// miner.setMinerAccount(kp);
// miner.setChainState(chain);
// miner.onMinedBlock((block) => {
//     console.log("~ BLOCK WAS MINED :) ~");
//     const prettyJson = JSON.stringify(block, null, 4);
//     console.log(prettyJson);
//     const blockValidation = operator.validateBlockRange(chain, [block]);
//     if (blockValidation.success) {
//         chain = blockValidation.chain;
//         miner.setChainState(chain);
//         storage.saveBlockchain(chain);
//     } else {
//         console.log("~ BAD BLOCK :( ~");
//         process.exit(1);
//     }
// });
// miner.startMining();
// const transfer = () => {
//     const source = storage.loadAccount("luis");
//     const dest = storage.loadAccount("agathe");
//     const txInfo = {
//         from: { address: source.publicKey },
//         to: [
//             {
//                 address: dest.publicKey,
//                 amount: 1,
//             },
//         ],
//         fee: 1,
//     };
//     const tx = operator.createTransaction(txInfo, source.privateKey, chain, []);
//     miner.addTransaction(tx);
// };
// setInterval(transfer, 15000);
// transfer();
/////////////////////////////
console.log("ok");
var kp = Encryption_1.genKeyPair();
var dest = Encryption_1.genKeyPair();
var node = new Node_1.Node(new BlockchainDataFactory_1.default(), new NodeProtocol_1.NodeProtocol(new NodeNet_1.NodeNet()));
var miner = node.createMiner(kp);
miner.startMining();
var wallet = node.createWallet(kp);
setInterval(function () {
    wallet.submitTransaction(dest.publicKey, 1, 0);
    wallet.submitTransaction(dest.publicKey, 1, 0);
}, 15000);
//# sourceMappingURL=main.js.map