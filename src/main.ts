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
} from "src/Encryption/Encryption";
import { BlockType } from "./BlockchainDataFactory/IBlock";
import { KeyPairKeyObjectResult } from "crypto";
import { BlockchainStorage } from "./BlockchainDataFactory/BlockchainStorage";
import { IBlockchainStorage } from "./Interfaces/IBlockchainStorage";
import { AccountTransactionType } from "./BlockchainDataFactory/IAccountTransaction";
import { Node } from "src/Node/Node";
import BlockchainDataFactory from "./BlockchainDataFactory/BlockchainDataFactory";

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

const acc1 = genKeyPair();
const acc2 = genKeyPair();

const node = new Node(
    new BlockchainDataFactory(),
    new NodeProtocol(new NodeNet())
);

const miner1 = node.createMiner(acc1);
const miner2 = node.createMiner(acc2);

miner1.startMining();
miner2.startMining();

const wallet1 = node.createWallet(acc1);
const wallet2 = node.createWallet(acc2);

setInterval(() => {
    wallet1.submitTransaction(acc2.publicKey, 1, 1);
    wallet2.submitTransaction(acc1.publicKey, 1, 1);
}, 20000);
