import { BlockchainChecker } from "src/BlockchainDataFactory/BlockchainChecker";
import { AccountTransactionValidator } from "src/BlockchainDataFactory/IAccountTransaction";
import { BlockValidator } from "src/BlockchainDataFactory/IBlock";
import IBlockchainDataFactory from "src/Interfaces/IBlockchainDataFactory";

export default class BlockchainDataFactory implements IBlockchainDataFactory {
    constructor() {}

    getTransactionShapeValidator() {
        return AccountTransactionValidator;
    }

    getBlockShapeValidator() {
        return BlockValidator;
    }

    createChainCheckerInstance() {
        return new BlockchainChecker();
    }

    getFactoryId() {
        return "meyercoin";
    }
}
