import { KeyPairKeyObjectResult } from "crypto";
import IBlockchainMiner from "src/Interfaces/IBlockchainMiner";
import { IBlockchainOperator } from "src/Interfaces/IBlockchainOperator";
import { BlockchainOperator } from "./BlockchainOperator";
import { AccountTransactionType } from "./IAccountTransaction";
import { BlockType } from "./IBlock";
import { CustomSet } from "src/Utils/CustomSet";
const deepEqual = require("deep-equal");

export class BlockchainMiner implements IBlockchainMiner {
    private txCache: CustomSet<AccountTransactionType> =
        new CustomSet<AccountTransactionType>((a, b) => deepEqual(a, b));
    private chain: BlockType[];

    private operator: IBlockchainOperator = new BlockchainOperator();

    constructor() {}
    // adds a tx to the cached txs, to be included inside the block.
    addTransaction(tx: AccountTransactionType): void {
        this.txCache.add(tx);
    }

    // appends a block to the chain state and updates the transaction
    // cache to remove the ones that are included inside this block
    appendNewBlock(block: BlockType): void {
        this.removeBlockTransactionsFromTxCache(block);
        this.chain.push(block);
    }

    private removeBlockTransactionsFromTxCache(block: BlockType) {
        block.payload.txs.forEach((tx) => {
            this.txCache.delete(tx);
        });
    }

    startMining(keypair: KeyPairKeyObjectResult): void {}

    stopMining(): void {}

    onMinedBlock(fn: (block: BlockType) => void): void {}
}
