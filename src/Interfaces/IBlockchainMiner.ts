import { KeyPairKeyObjectResult } from "crypto";

export default interface IBlockchainMiner {
    // adds a tx to the cached txs, to be included inside the block.
    addTransaction(tx: unknown): void;

    // appends a block to the chain state and updates the transaction
    // cache to remove the ones that are included inside this block
    appendNewBlock(block: unknown): void;

    startMining(keypair: KeyPairKeyObjectResult): void;
    stopMining(): void;
    onMinedBlock(fn: (block: unknown) => void): void;
}
