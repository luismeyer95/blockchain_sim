import { BlockType } from "src/Interfaces/IBlock";
import { AccountTransactionType } from "src/Interfaces/IAccountTransaction";
import { AccountOperationType } from "src/Interfaces/IAccountOperation";
import {
    hash,
    verify,
    hashSatisfiesComplexity,
    deserializeKey,
} from "src/Encryption/Encryption";

type BlockRangeValidationResult =
    | {
          success: true;
          chain: BlockType[];
      }
    | {
          success: false;
          missing: [number, number] | null;
      };

export class BlockchainChecker {
    constructor() {}

    isAppendable(chain: BlockType[], block: BlockType) {
        const rangeFirstIndex = block.payload.index;
        if (chain.length === 0) return block.payload.index === 0;
        return chain[chain.length - 1].payload.index + 1 === rangeFirstIndex;
    }

    getMissingRange(
        chain: BlockType[],
        block: BlockType
    ): [number, number] | null {
        if (!this.isAppendable(chain, block)) {
            const start = chain.length
                ? chain[chain.length - 1].payload.index
                : 0;
            return [start, block.payload.index + 1];
        }
        return null;
    }

    validateBlockRange(
        chain: BlockType[],
        blocks: BlockType[]
    ): BlockRangeValidationResult {
        if (blocks.length === 0)
            throw new Error("empty block array submission");
        const missingRange = this.getMissingRange(chain, blocks[0]);
        if (missingRange) return { success: false, missing: missingRange };

        const resultChain = chain.filter(
            (block) => block.payload.index < blocks[0].payload.index
        );
        try {
            blocks.forEach((block) => {
                this.tryAddBlock(resultChain, block);
            });
        } catch {
            return { success: false, missing: null };
        }
        return {
            success: true,
            chain: resultChain,
        };
    }

    private tryAddBlock(chain: BlockType[], block: BlockType) {
        this.verifyBlock(chain, block);
        chain[block.payload.index] = block;
    }

    private verifyBlock(chain: BlockType[], block: BlockType) {
        const revChain = this.getReverseChain(chain, block.payload.index);

        // TODO: REMOVE HARDCODED COMPLEXITY!!
        this.verifyBlockPayloadHash(block, 23);
        this.verifyIncludedPrevBlockHash(chain, block);
        this.verifyBlockCoinbaseSignature(block);
        this.verifyBlockTimestamps(chain, block);
        this.verifyNoDupeRefWithinBlock(block);
        this.verifyOperationRef(block.payload.coinbase.payload.to, revChain);
        this.verifyBlockTransactions(block, revChain);
        // TODO: REMOVE HARDCODED BLOCK REWARD!!
        this.verifyBlockFullRewardBalance(block, 10);
    }

    private verifyOperationRef(
        txOp: AccountOperationType,
        revChain: BlockType[]
    ) {
        if (txOp.last_ref === null)
            this.verifyNullLastRefOperation(txOp, revChain);
        else this.verifyNonNullLastRefOperation(txOp, revChain);
    }

    // private verifyBlockIndexContinuity(block: BlockType): boolean {
    //     const blockIndex = block.payload.index;
    //     return !(this.getLastBlockIndex() + 1 < blockIndex);
    // }

    private verifyBlockPayloadHash(block: BlockType, complexity: number) {
        const payloadString = JSON.stringify(block.payload);
        const hashed = hash(Buffer.from(payloadString));
        const base64hash = hashed.digest("base64");
        const isGold = hashSatisfiesComplexity(payloadString, complexity);
        if (!isGold.success || base64hash !== block.header.hash)
            throw new Error("bad block hash");
    }

    private verifyIncludedPrevBlockHash(chain: BlockType[], block: BlockType) {
        const prevHash = block.payload.previous_hash;
        const blockIndex = block.payload.index;
        if (blockIndex === 0) {
            if (prevHash !== null) throw new Error("bad previous block hash");
        } else {
            const prevBlock = this.getPreviousBlock(chain, block);
            if (prevBlock) {
                const localPrevHash = prevBlock.header.hash;
                if (prevHash !== localPrevHash)
                    throw new Error("bad previous block hash");
            } else {
                throw new Error("error: did not check for block continuity");
                // should NOT happen
            }
        }
    }

    private verifyBlockTimestamps(chain: BlockType[], block: BlockType) {
        const prevBlock = this.getPreviousBlock(chain, block);
        if (prevBlock) {
            const blockCheck =
                prevBlock.payload.timestamp < block.payload.timestamp &&
                block.payload.timestamp < Date.now();
            const coinbaseTimestamp = block.payload.coinbase.payload.timestamp;
            const coinbaseCheck =
                prevBlock.payload.timestamp < coinbaseTimestamp &&
                coinbaseTimestamp < Date.now();
            if (!blockCheck || !coinbaseCheck)
                throw new Error("bad block timestamps");
        }
        throw new Error("error: did not check for block continuity");
    }

    private getPreviousBlock(
        chain: BlockType[],
        block: BlockType
    ): BlockType | null {
        const blockIndex = block.payload.index;
        if (blockIndex === 0 || chain.length < blockIndex) return null;
        return chain[blockIndex - 1];
    }

    private verifyBlockCoinbaseSignature(block: BlockType) {
        const coinbaseSig = Buffer.from(
            block.payload.coinbase.header.signature,
            "base64"
        );
        const publicKeyMiner = deserializeKey(
            block.payload.coinbase.payload.to.address,
            "public"
        );
        const coinbasePayload = Buffer.from(
            JSON.stringify(block.payload.coinbase.payload)
        );
        if (!verify(coinbasePayload, publicKeyMiner, coinbaseSig))
            throw new Error("bad block coinbase signature");
    }

    private verifyNoDupeLastRefInBlockchainTx(
        tx: AccountTransactionType,
        publicKey: string,
        lastRef: string
    ) {
        tx.payload.to.forEach((output) => {
            if (output.address === publicKey && output.last_ref === lastRef)
                throw new Error("last_ref is already referenced");
        });
    }

    private extractBalanceOfAccountFromTx(
        tx: AccountTransactionType,
        publicKey: string
    ) {
        const output = tx.payload.to.find((op) => op.address === publicKey);
        if (!output)
            throw new Error(
                "reference exists but no output for given address was found"
            );
        return output.updated_balance;
    }

    private getReverseChain(chain: BlockType[], stopIndex: number) {
        return chain
            .slice()
            .filter((block) => block.payload.index < stopIndex)
            .reverse();
    }

    // throws
    private retrieveLastReferencedTx(
        publicKey: string,
        lastRef: string,
        revChain: BlockType[]
    ) {
        for (const block of revChain) {
            for (const tx of block.payload.txs) {
                this.verifyNoDupeLastRefInBlockchainTx(tx, publicKey, lastRef);
                if (tx.header.signature === lastRef) {
                    return tx;
                }
            }
        }
        throw new Error("last reference not found");
    }

    private verifyNoDupeRefWithinBlock(block: BlockType) {
        const keyRefPairs = [
            block.payload.coinbase.payload.to.last_ref +
                block.payload.coinbase.payload.to.address,
        ];
        block.payload.txs.forEach((tx) => {
            keyRefPairs.push(
                tx.payload.from.last_ref + tx.payload.from.address
            );
            const toPairs = tx.payload.to.map((op) => op.last_ref + op.address);
            keyRefPairs.push(...toPairs);
        });
        const keyRefPairSet = new Set(keyRefPairs);
        if (keyRefPairs.length !== keyRefPairSet.size)
            throw new Error(
                "found dupe (last_ref, address) pair within block operations"
            );
    }

    private verifyNoPriorTxOnAccount(publicKey: string, revChain: BlockType[]) {
        for (const block of revChain) {
            if (block.payload.coinbase.payload.to.address === publicKey)
                throw new Error("found prior tx on account");
            for (const tx of block.payload.txs) {
                for (const output of tx.payload.to) {
                    if (output.address === publicKey)
                        throw new Error("found prior tx on account");
                }
            }
        }
    }

    private verifyNullLastRefOperation(
        txOp: AccountOperationType,
        revChain: BlockType[]
    ) {
        this.verifyNoPriorTxOnAccount(txOp.address, revChain);
        if (txOp.operation !== txOp.updated_balance)
            throw new Error("bad first account tx balance");
    }

    private verifyNonNullLastRefOperation(
        txOp: AccountOperationType,
        revChain: BlockType[]
    ) {
        const refTx = this.retrieveLastReferencedTx(
            txOp.address,
            txOp.last_ref!,
            revChain
        );
        const lastBalance = this.extractBalanceOfAccountFromTx(
            refTx,
            txOp.address
        );
        if (lastBalance + txOp.operation !== txOp.updated_balance)
            throw new Error("bad account balance update");
    }

    private verifyOperationSign(
        txOp: AccountOperationType,
        type: "from" | "to"
    ) {
        if (
            (txOp.operation < 0 && type === "to") ||
            (txOp.operation > 0 && type === "from")
        )
            throw new Error("bad sign for tx operation field");
    }

    private verifyTransaction(
        tx: AccountTransactionType,
        revChain: BlockType[]
    ) {
        if (tx.payload.from.last_ref === null)
            throw new Error("source account of tx has null last ref");
        this.verifyNonNullLastRefOperation(tx.payload.from, revChain);
        this.verifyOperationSign(tx.payload.from, "from");
        this.verifyTransactionSignature(tx);
        this.verifyUnicityAcrossDestinationAccountsOfTx(tx);
        this.verifyTransactionOperationsBalance(tx);
        tx.payload.to.forEach((txOp) => {
            this.verifyOperationSign(txOp, "to");
            if (txOp.last_ref === null) {
                this.verifyNullLastRefOperation(txOp, revChain);
            } else {
                this.verifyNonNullLastRefOperation(txOp, revChain);
            }
        });
    }

    private verifyTransactionSignature(tx: AccountTransactionType) {
        const sig = Buffer.from(tx.header.signature, "base64");
        const fromKey = deserializeKey(tx.payload.from.address, "public");
        const txPayload = Buffer.from(JSON.stringify(tx.payload));
        if (!verify(txPayload, fromKey, sig))
            throw new Error("bad transaction signature");
    }

    private verifyUnicityAcrossDestinationAccountsOfTx(
        tx: AccountTransactionType
    ) {
        const addressArr = tx.payload.to.map((op) => op.address);
        const addressSet = new Set(addressArr);
        if (addressArr.length !== addressSet.size) {
            throw new Error("duplicate address found in tx output operations");
        }
    }

    private verifyTransactionOperationsBalance(tx: AccountTransactionType) {
        const destBalance = tx.payload.to.reduce(
            (acc, el) => acc + el.operation,
            0
        );
        const sourceBalance = tx.payload.from.operation;
        if (sourceBalance + destBalance + tx.payload.miner_fee !== 0)
            throw new Error("bad transaction balance");
    }

    private verifyBlockTransactions(block: BlockType, revChain: BlockType[]) {
        for (const tx of block.payload.txs) {
            this.verifyTransaction(tx, revChain);
        }
    }

    private verifyBlockFullRewardBalance(
        block: BlockType,
        setBlockReward: number
    ) {
        const coinbaseOperation = block.payload.coinbase.payload.to.operation;
        const sumFees = block.payload.txs.reduce(
            (acc, el) => acc + el.payload.miner_fee,
            0
        );
        if (coinbaseOperation !== sumFees + setBlockReward)
            throw new Error("bad block full reward balance");
    }
}
