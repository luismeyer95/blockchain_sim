import { BlockType, BlockValidator } from "src/BlockchainDataFactory/IBlock";
import {
    AccountTransactionType,
    AccountTransactionValidator,
} from "src/BlockchainDataFactory/IAccountTransaction";
import { AccountOperationType } from "src/BlockchainDataFactory/IAccountOperation";
import {
    hash,
    verify,
    hashSatisfiesComplexity,
    deserializeKey,
    serializeKey,
    sign,
} from "src/Encryption/Encryption";
import {
    IBlockchainOperator,
    TransactionInfo,
    TransactionValidationResult,
} from "src/Interfaces/IBlockchainOperator";
import _, { fromPairs, last, sum } from "lodash";
import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import { CoinbaseTransactionType } from "./ICoinbaseTransaction";

export type BlockRangeValidationResult =
    | {
          success: true;
          chain: BlockType[];
      }
    | {
          success: false;
          missing: [number, number] | null;
      };

export class BlockchainOperator implements IBlockchainOperator {
    constructor() {}

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
        // try {
        blocks.forEach((block) => {
            this.tryAddBlock(resultChain, block);
        });
        // } catch {
        // return { success: false, missing: null };
        // }
        return {
            success: true,
            chain: resultChain,
        };
    }

    getTransactionShapeValidator() {
        return AccountTransactionValidator;
    }

    getBlockShapeValidator() {
        return BlockValidator;
    }

    validateTransaction(
        chain: BlockType[],
        tx: AccountTransactionType
    ): TransactionValidationResult {
        const revChain = this.getReverseChain(chain);
        try {
            this.verifyTransaction(tx, revChain);
        } catch (err) {
            return {
                success: false,
                message: err.message,
            };
        }
        return { success: true };
    }

    private createAccountOperation(
        publicKey: KeyObject,
        operation: number,
        revChain: BlockType[]
    ): AccountOperationType {
        const address = serializeKey(publicKey);
        const result = this.retrieveLastAccountOperation(address, revChain);
        const last_ref = result ? result.ref : null;
        const updated_balance = result
            ? result.op.updated_balance + operation
            : operation;
        return {
            address,
            operation,
            last_ref,
            updated_balance,
        };
    }

    // verify sum(to[].amount) + fee against account funds
    createTransaction(
        chain: BlockType[],
        info: TransactionInfo,
        privateKey: KeyObject
    ): AccountTransactionType {
        const revChain = this.getReverseChain(chain);
        const destOperations: AccountOperationType[] = info.to.map((destOp) => {
            return this.createAccountOperation(
                destOp.address,
                destOp.amount,
                revChain
            );
        });
        const fromMovement =
            destOperations.reduce((acc, el) => acc - el.operation, 0) -
            info.fee;
        const fromOperation = this.createAccountOperation(
            info.from.address,
            fromMovement,
            revChain
        );
        const txPayload = {
            from: fromOperation,
            to: destOperations,
            miner_fee: info.fee,
            timestamp: Date.now(),
        };
        const txPayloadBuffer = Buffer.from(JSON.stringify(txPayload));

        const tx: AccountTransactionType = {
            header: {
                signature: sign(txPayloadBuffer, privateKey).toString("base64"),
            },
            payload: txPayload,
        };
        this.verifyTransaction(tx, revChain);
        // console.log(JSON.stringify(tx, null, 4));
        // process.exit(0);
        return tx;
    }

    private getLastBlock(chain: BlockType[]) {
        if (chain.length) {
            return chain[chain.length - 1];
        }
        return null;
    }

    private createCoinbaseTransaction(
        keypair: KeyPairKeyObjectResult,
        txs: AccountTransactionType[],
        chain: BlockType[]
    ): CoinbaseTransactionType {
        const sumFees = txs.reduce((acc, el) => {
            return acc + el.payload.miner_fee;
        }, 0);
        const blockReward = 10;
        const revChain = this.getReverseChain(chain);
        const to = this.createAccountOperation(
            keypair.publicKey,
            sumFees + blockReward,
            revChain
        );
        const payload = {
            to,
            timestamp: Date.now(),
        };
        const payloadBuf = Buffer.from(JSON.stringify(payload));
        const signatureBuf = sign(payloadBuf, keypair.privateKey);
        const signature = signatureBuf.toString("base64");
        const coinbase = {
            header: {
                signature,
            },
            payload,
        };
        return coinbase;
    }

    createBlockTemplate(
        keypair: KeyPairKeyObjectResult,
        txs: AccountTransactionType[],
        chain: BlockType[]
    ): BlockType {
        const coinbase = this.createCoinbaseTransaction(keypair, txs, chain);
        const lastBlock = this.getLastBlock(chain);
        let index = 0;
        let previous_hash: string | null = "";
        if (lastBlock) {
            index = lastBlock.payload.index + 1;
            previous_hash = lastBlock.header.hash;
        } else {
            index = 0;
            previous_hash = null;
        }
        return {
            header: {
                hash: "",
            },
            payload: {
                timestamp: Date.now(),
                nonce: 0,
                index,
                previous_hash,
                coinbase,
                txs,
            },
        };
    }

    private isAppendable(chain: BlockType[], block: BlockType) {
        const rangeFirstIndex = block.payload.index;
        if (chain.length === 0) return block.payload.index === 0;
        return chain[chain.length - 1].payload.index + 1 === rangeFirstIndex;
    }

    private getMissingRange(
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

    private tryAddBlock(chain: BlockType[], block: BlockType) {
        this.verifyBlock(chain, block);
        chain[block.payload.index] = block;
    }

    private verifyBlock(chain: BlockType[], block: BlockType) {
        const revChain = this.getReverseChain(chain, block.payload.index);

        // TODO: REMOVE HARDCODED COMPLEXITY!!
        this.verifyBlockPayloadHash(block, 20);
        this.verifyIncludedPrevBlockHash(chain, block);
        this.verifyBlockCoinbaseSignature(block);
        this.verifyBlockTimestamps(chain, block);
        // this.verifyNoDupeRefWithinBlock(block);
        this.verifyOperation(block.payload.coinbase.payload.to, revChain);
        this.verifyBlockTransactions(block, revChain);
        // TODO: REMOVE HARDCODED BLOCK REWARD!!
        this.verifyBlockFullRewardBalance(block, 10);
    }

    private verifyOperation(txOp: AccountOperationType, revChain: BlockType[]) {
        if (txOp.op_nonce === 0) this.verifyZeroNonceOperation(txOp, revChain);
        else this.verifyNonZeroNonceOperation(txOp, revChain);
    }

    private verifyZeroNonceOperation(
        txOp: AccountOperationType,
        revChain: BlockType[]
    ) {
        // this.verifyNoPriorTxOnAccount(txOp.address, revChain);
        if (txOp.operation !== txOp.updated_balance)
            throw new Error("bad first account tx balance");
        const lastOp = this.retrieveLastAccountOperation(
            txOp.address,
            revChain
        );
        if (lastOp) throw new Error("found prior operation on account");
    }

    private verifyNonZeroNonceOperation(
        txOp: AccountOperationType,
        revChain: BlockType[]
    ) {
        const lastOp = this.retrieveLastAccountOperation(
            txOp.address,
            revChain
        );
        if (!lastOp)
            throw new Error(
                "operation nonce is not null but no record of last operation"
            );
        this.verifyOperationCongruence(lastOp, txOp);
        // if (lastOp.op_nonce + 1 !== txOp.op_nonce)
        //     throw new Error("bad op nonce");

        // if (lastOp.updated_balance + txOp.operation !== txOp.updated_balance)
        //     throw new Error("bad account balance update");
    }

    private retrieveLastAccountOperation(
        publicKey: string,
        revChain: BlockType[]
    ): AccountOperationType | null {
        for (const block of revChain) {
            if (block.payload.coinbase.payload.to.address === publicKey)
                return block.payload.coinbase.payload.to;
            for (const tx of block.payload.txs) {
                if (tx.payload.from.address === publicKey)
                    return tx.payload.from;
                if (tx.payload.to.address === publicKey) return tx.payload.to;
            }
        }
        return null;
    }

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
        const now = Date.now();
        const blockStamp = block.payload.timestamp;
        const coinbaseStamp = block.payload.coinbase.payload.timestamp;
        let blockCheck: boolean, coinbaseCheck: boolean;
        if (prevBlock) {
            const prevBlockStamp = prevBlock.payload.timestamp;
            blockCheck = prevBlockStamp < blockStamp && blockStamp < now;
            coinbaseCheck =
                prevBlockStamp < coinbaseStamp && coinbaseStamp < now;
        } else {
            blockCheck = blockStamp < now;
            coinbaseCheck = coinbaseStamp < now;
        }
        if (!blockCheck || !coinbaseCheck)
            throw new Error("bad block timestamps");
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
        const coinbase = block.payload.coinbase;
        const coinbaseSig = Buffer.from(coinbase.header.signature, "base64");
        const publicKeyMiner = deserializeKey(
            coinbase.payload.to.address,
            "public"
        );
        const coinbasePayload = Buffer.from(JSON.stringify(coinbase.payload));
        if (!verify(coinbasePayload, publicKeyMiner, coinbaseSig))
            throw new Error("bad block coinbase signature");
    }

    private getReverseChain(
        chain: BlockType[],
        stopIndex: number = chain.length
    ) {
        return chain
            .slice()
            .filter((block) => block.payload.index < stopIndex)
            .reverse();
    }

    // private verifyNoDupeRefWithinBlock(block: BlockType) {
    //     const keyRefPairs = [
    //         block.payload.coinbase.payload.to.last_ref +
    //             block.payload.coinbase.payload.to.address,
    //     ];
    //     block.payload.txs.forEach((tx) => {
    //         keyRefPairs.push(
    //             tx.payload.from.last_ref + tx.payload.from.address
    //         );
    //         const toPairs = tx.payload.to.map((op) => op.last_ref + op.address);
    //         keyRefPairs.push(...toPairs);
    //     });
    //     const keyRefPairSet = new Set(keyRefPairs);
    //     if (keyRefPairs.length !== keyRefPairSet.size)
    //         throw new Error(
    //             "found dupe (last_ref, address) pair within block operations"
    //         );
    // }

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
        revChain: BlockType[],
        txPool?: AccountTransactionType[]
    ) {
        this.verifyTransactionAgainstBlockchain(tx, revChain);
    }

    private verifyTransactionAgainstBlockchain(
        tx: AccountTransactionType,
        revChain: BlockType[]
    ) {
        if (tx.payload.from.op_nonce === 0)
            throw new Error("source account of tx has null last ref");
        this.verifyNonZeroNonceOperation(tx.payload.from, revChain);
        this.verifyOperationSign(tx.payload.from, "from");
        this.verifyTransactionSignature(tx);
        this.verifyTransactionOperationsBalance(tx);
        this.verifyNoNegativeBalanceInTransaction(tx);
        this.verifyOperationSign(tx.payload.to, "to");
        this.verifyOperation(tx.payload.to, revChain);
    }

    private verifyTransactionAgainstTrustedPool(
        tx: AccountTransactionType,
        txPool: AccountTransactionType[]
    ) {
        this.verifyOperationAgainstTrustedPool(tx.payload.from, txPool);
        this.verifyOperationAgainstTrustedPool(tx.payload.to, txPool);
    }

    private verifyOperationAgainstTrustedPool(
        op: AccountOperationType,
        txPool: AccountTransactionType[]
    ) {
        const res = this.retrieveLastAccountOperationInTxPool(
            op.address,
            txPool
        );
        if (res) {
            const { op: lastOp } = res;
            this.verifyOperationCongruence(lastOp, op);
        }
    }

    private retrieveLastAccountOperationInTxPool(
        publicKey: string,
        txs: AccountTransactionType[],
        len?: number
    ): { index: number; op: AccountOperationType } | null {
        // reverse iteration
        const length = len ? len : txs.length;
        for (let i = length - 1; i >= 0; --i) {
            const tx = txs[i];
            if (tx.payload.from.address === publicKey)
                return { index: i, op: tx.payload.from };
            if (tx.payload.to.address === publicKey)
                return { index: i, op: tx.payload.to };
        }
        return null;
    }

    private verifyOperationCongruence(
        prev: AccountOperationType,
        cur: AccountOperationType
    ) {
        if (prev.address != cur.address) throw new Error("different address");
        if (prev.op_nonce + 1 !== cur.op_nonce) throw new Error("bad op nonce");
        if (prev.updated_balance + cur.operation !== cur.updated_balance)
            throw new Error("bad updated balance");
    }

    private verifyTransactionPool() {
        // let cur = null;
        // let prev = null;
        // do {
        //     prev = cur;
        //     cur = this.retrieveLastAccountOperationInTxPool(
        //         tx.payload.from.address,
        //         txPool
        //     );
        //     if (cur) {
        //         if (res.op.op_nonce + 1 !== tx.payload.from.op_nonce)
        //     }
        // } while (res);
    }

    private verifyTransactionSignature(tx: AccountTransactionType) {
        const sig = Buffer.from(tx.header.signature, "base64");
        const fromKey = deserializeKey(tx.payload.from.address, "public");
        const txPayload = Buffer.from(JSON.stringify(tx.payload));
        if (!verify(txPayload, fromKey, sig))
            throw new Error("bad transaction signature");
    }

    private verifyTransactionOperationsBalance(tx: AccountTransactionType) {
        const destBalance = tx.payload.to.operation;
        const sourceBalance = tx.payload.from.operation;
        const balance = sourceBalance + destBalance + tx.payload.miner_fee;
        if (balance !== 0)
            throw new Error(`bad transaction balance: ${balance} !== 0`);
    }

    private verifyNoNegativeBalanceInTransaction(tx: AccountTransactionType) {
        const err = new Error("negative balance for transaction");
        if (tx.payload.to.updated_balance < 0) throw err;
        if (tx.payload.from.updated_balance < 0) throw err;
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
