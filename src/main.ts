import { NodeNet } from "src/Net/NodeNet";
import { NodeProtocol } from "src/Protocol/NodeProtocol";
import { BlockchainMiner } from "./BlockchainDataFactory/BlockchainMiner";
import { BlockchainWallet } from "src/BlockchainDataFactory/BlockchainWallet";
import { genKeyPair } from "src/Encryption/Encryption";
import { Node } from "src/Node/Node";
import { BlockchainState } from "./BlockchainDataFactory/BlockchainState";
import _ from "lodash";

const acc1 = genKeyPair();
const acc2 = genKeyPair();

const state = new BlockchainState();
// const node = new Node(state, new NodeProtocol(new NodeNet()));

const miner1 = state.createMiner(acc1, BlockchainMiner);
const miner2 = state.createMiner(acc2, BlockchainMiner);

miner1.startMining();
miner2.startMining();

const wallet1 = state.createWallet(acc1, BlockchainWallet);
const wallet2 = state.createWallet(acc2, BlockchainWallet);

setInterval(() => {
    wallet1.submitTransaction(acc2.publicKey, 1, 1);
    wallet2.submitTransaction(acc1.publicKey, 1, 1);
}, 20000);
