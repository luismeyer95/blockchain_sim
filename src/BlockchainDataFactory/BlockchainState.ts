import IBlockchainState from "src/Interfaces/IBlockchainState";
import { AccountTransactionType } from "./IAccountTransaction";
import { BlockType } from "./IBlock";
import { CustomSet } from "src/Utils/CustomSet";
import { BlockchainOperator } from "./BlockchainOperator";
import { TransactionValidationResult } from "src/Interfaces/IBlockchainState";
import EventEmitter from "events";
import { BlockchainStorage } from "src/BlockchainDataFactory/BlockchainStorage";

const storage = new BlockchainStorage();

export class BlockchainState extends EventEmitter implements IBlockchainState {
    private operator: BlockchainOperator = new BlockchainOperator();
    // private events: EventEmitter = new EventEmitter();
    private txpool: AccountTransactionType[] = [];
    private chain: BlockType[] = [];
    // private log: ILogger;

    constructor() {
        super();
    }

    getChainState(): BlockType[] {
        return this.chain;
    }

    getTxPoolState(): AccountTransactionType[] {
        return this.txpool;
    }

    // adds a tx to the cached txs, to be included inside the block.
    addTransaction(tx: AccountTransactionType): TransactionValidationResult {
        const validation = this.operator.validateTransaction(
            tx,
            this.chain,
            this.txpool
        );
        if (validation.success) this.txpool.push(tx);
        this.emit("change");
        return validation;
    }

    // private logTxPool(msg: string) {
    //     console.log(
    //         msg,
    //         JSON.stringify(
    //             this.txpool.map((el) => el.header.signature),
    //             null,
    //             4
    //         )
    //     );
    // }

    // updates the chain state and updates the transaction
    // cache to remove the ones that are included inside the blocks
    // that changed
    setChainState(chain: BlockType[]): void {
        // this.logTxPool("BEFORE");
        const firstChangingBlock: BlockType | undefined = chain.find(
            (block, index) => {
                if (index >= this.chain.length) return true;
                const localBlock = this.chain[index];
                return localBlock.header.hash !== block.header.hash;
            }
        );
        if (!firstChangingBlock) return;
        const changeIndex = firstChangingBlock.payload.index;
        const chainToAppend = chain.slice(changeIndex);
        chainToAppend.forEach((block) => {
            this.removeBlockTransactionsFromTxPool(block);
        });
        this.chain.splice(
            changeIndex,
            this.chain.length - changeIndex,
            ...chainToAppend
        );
        // this.logTxPool("AFTER");
        this.emit("change");
        storage.saveBlockchain(this.chain);
    }

    private removeBlockTransactionsFromTxPool(block: BlockType) {
        this.txpool = this.txpool.filter((tx) => {
            const found = block.payload.txs.find(
                (btx) => btx.header.signature === tx.header.signature
            );
            return !found;
        });
    }
}
