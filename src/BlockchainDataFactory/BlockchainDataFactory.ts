import { BlockchainOperator } from "src/BlockchainDataFactory/BlockchainOperator";
import { AccountTransactionValidator } from "src/BlockchainDataFactory/IAccountTransaction";
import { BlockValidator } from "src/BlockchainDataFactory/IBlock";
import IBlockchainDataFactory from "src/Interfaces/IBlockchainDataFactory";
import { BlockchainState } from "./BlockchainState";
import { BlockchainMiner } from "./BlockchainMiner";
import BlockchainWallet from "./BlockchainWallet";
import { KeyPairKeyObjectResult } from "crypto";
import IBlockchainState from "src/Interfaces/IBlockchainState";
import { BlockchainForkedMiner } from "./BlockchainForkedMiner";

// export default class BlockchainDataFactory implements IBlockchainDataFactory {
//     constructor() {}

//     getTransactionShapeValidator() {
//         return AccountTransactionValidator;
//     }
//     getBlockShapeValidator() {
//         return BlockValidator;
//     }

//     createChainOperatorInstance() {
//         return new BlockchainOperator();
//     }

//     createMinerInstance(
//         keypair: KeyPairKeyObjectResult,
//         state: IBlockchainState
//     ) {
//         return new BlockchainMiner(keypair, state as BlockchainState);
//         // return new BlockchainForkedMiner(keypair, state as BlockchainState);
//     }

//     createStateInstance() {
//         return new BlockchainState();
//     }

//     createWalletInstance(
//         keypair: KeyPairKeyObjectResult,
//         state: IBlockchainState
//     ) {
//         return new BlockchainWallet(keypair, state as BlockchainState);
//     }
// }
