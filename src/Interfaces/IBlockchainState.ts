import { KeyPairKeyObjectResult } from "crypto";
import { EventEmitter } from "stream";

export type TransactionValidationResult =
    | {
          success: true;
      }
    | {
          success: false;
          message: string;
      };

export default interface IBlockchainState extends EventEmitter {
    // adds a tx to the cached txs, to be included inside the block.
    addTransaction(tx: unknown): TransactionValidationResult;

    // updates the chain state and updates the transaction
    // cache to remove the ones that are included inside the blocks
    // that changed
    setChainState(chain: unknown[]): void;

    getChainState(): unknown[];

    getTxPoolState(): unknown[];
}
