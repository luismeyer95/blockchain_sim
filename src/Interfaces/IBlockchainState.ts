import { KeyPairKeyObjectResult } from "crypto";
import { SuccessErrorCallbacks } from "src/Utils/SuccessErrorCallbacks";
import { EventEmitter } from "stream";

export default interface IBlockchainState extends EventEmitter {
    // adds a tx to the cached txs, to be included inside the block.
    addTransaction(
        tx: unknown,
        callbacks: SuccessErrorCallbacks<void, string>
    ): void;

    submitBlocks(
        blocks: unknown,
        callbacks: SuccessErrorCallbacks<unknown[], [number, number] | null>
    ): void;

    onLocalBlockAppend(fn: (serializedBlock: string) => unknown): void;

    onLocalTransactionAppend(fn: (serializedTx: string) => unknown): void;

    // updates the chain state and updates the transaction
    // cache to remove the ones that are included inside the blocks
    // that changed
    setChainState(chain: unknown[]): void;

    getChainState(): unknown[];

    getTxPoolState(): unknown[];
}
