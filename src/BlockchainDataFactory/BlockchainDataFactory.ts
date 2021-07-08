import { BlockchainOperator } from "src/BlockchainDataFactory/BlockchainOperator";
import { AccountTransactionValidator } from "src/BlockchainDataFactory/IAccountTransaction";
import { BlockValidator } from "src/BlockchainDataFactory/IBlock";
import IBlockchainDataFactory from "src/Interfaces/IBlockchainDataFactory";

export default class BlockchainDataFactory implements IBlockchainDataFactory {
    constructor() {}

    createChainOperatorInstance() {
        return new BlockchainOperator();
    }

    createMinerInstance() {
        return new BlockchainMiner();
    }

    getFactoryId() {
        return "meyercoin";
    }
}
