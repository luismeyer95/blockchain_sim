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
import { KeyPairKeyObjectResult } from "crypto";
import { Storage } from "./Storage/Storage";

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

let chain: BlockType[] = Storage.loadBlockchain() as BlockType[];

let kp = Storage.loadAccount("main");

const miner = new BlockchainMiner();
const operator = new BlockchainOperator();

miner.setMinerAccount(kp);
miner.setChainState(chain);
miner.onMinedBlock((block) => {
    console.log("~ BLOCK WAS MINED :) ~");
    const prettyJson = JSON.stringify(block, null, 4);
    console.log(prettyJson);

    const blockValidation = operator.validateBlockRange(chain, [block]);
    if (blockValidation.success) {
        chain = blockValidation.chain;
        miner.setChainState(chain);
        Storage.saveBlockchain(chain);
    } else {
        console.log("~ BAD BLOCK :( ~");
        process.exit(1);
    }
});
miner.startMining();

const transfer = () => {
    const source = Storage.loadAccount("luis");
    const dest = Storage.loadAccount("agathe");
    const txInfo = {
        from: { address: source.publicKey },
        to: [
            {
                address: dest.publicKey,
                amount: 1,
            },
        ],
        fee: 1,
    };
    const tx = operator.createTransaction(chain, txInfo, source.privateKey);
    miner.addTransaction(tx);
};

// setInterval(transfer, 15000);
transfer();

/////////////////////////////
