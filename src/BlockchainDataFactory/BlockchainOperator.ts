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
} from "src/Interfaces/IBlockchainOperator";
import _, { fromPairs, last, partial, sum } from "lodash";
import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import { CoinbaseTransactionType } from "./ICoinbaseTransaction";
import { SuccessErrorCallbacks } from "src/Utils/SuccessErrorCallbacks";

export class BlockchainOperator implements IBlockchainOperator {
    constructor() {}

    validateBlockRange(
        chain: BlockType[],
        blocks: BlockType[],
        callbacks: SuccessErrorCallbacks<BlockType[], [number, number] | null>
    ): void {
        if (blocks.length === 0) return;
        const missingRange = this.getMissingRange(chain, blocks[0]);
        if (missingRange) {
            callbacks.onError(missingRange);
            return;
        }
        const resultChain = chain.filter(
            (block) => block.payload.index < blocks[0].payload.index
        );
        // try {
        blocks.forEach((block) => {
            this.tryAddBlock(resultChain, block);
        });
        // } catch {
        //     callbacks.onError(null);
        //     return;
        // }
        callbacks.onSuccess(resultChain);
    }

    private getMissingRange(
        chain: BlockType[],
        block: BlockType
    ): [number, number] | null {
        if (!this.isAppendable(chain, block)) {
            return [chain.length, block.payload.index];
        }
        return null;
    }

    private isAppendable(chain: BlockType[], block: BlockType) {
        return block.payload.index <= chain.length;
    }

    getTransactionShapeValidator() {
        return AccountTransactionValidator;
    }

    getBlockShapeValidator() {
        return BlockValidator;
    }

    validateTransaction(
        tx: AccountTransactionType,
        chain: BlockType[],
        txpool: AccountTransactionType[],
        callbacks: SuccessErrorCallbacks<void, string>
    ): void {
        try {
            this.verifyTransaction(tx, chain, txpool);
            callbacks.onSuccess();
        } catch (err) {
            callbacks.onError(err.message);
        }
    }

    private createAccountOperation(
        publicKey: KeyObject,
        operation: number,
        chain: BlockType[],
        txpool: AccountTransactionType[]
    ): AccountOperationType {
        const address = serializeKey(publicKey);
        const res = this.retrieveLastAccountOperationInTxPool(address, txpool);
        if (res) {
            return {
                address,
                operation,
                op_nonce: res.op.op_nonce + 1,
                updated_balance: res.op.updated_balance + operation,
            };
        }
        const result = this.retrieveLastAccountOperation(address, chain);
        if (result) {
            return {
                address,
                operation,
                op_nonce: result.op_nonce + 1,
                updated_balance: result.updated_balance + operation,
            };
        }
        return {
            address,
            operation,
            op_nonce: 0,
            updated_balance: operation,
        };
    }

    // verify sum(to[].amount) + fee against account funds
    createTransaction(
        info: TransactionInfo,
        privateKey: KeyObject,
        chain: BlockType[],
        txpool: AccountTransactionType[]
    ): AccountTransactionType {
        // const revChain = this.getReverseChain(chain);
        const destOperation: AccountOperationType = this.createAccountOperation(
            info.to,
            info.amount,
            chain,
            txpool
        );
        const fromMovement = -info.amount - info.fee;
        const fromOperation = this.createAccountOperation(
            info.from,
            fromMovement,
            chain,
            txpool
        );
        const txPayload = {
            from: fromOperation,
            to: destOperation,
            miner_fee: info.fee,
        };
        const txPayloadBuffer = Buffer.from(JSON.stringify(txPayload));
        const tx: AccountTransactionType = {
            header: {
                signature: sign(txPayloadBuffer, privateKey).toString("base64"),
            },
            payload: txPayload,
        };
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
        chain: BlockType[],
        txpool: AccountTransactionType[]
    ): CoinbaseTransactionType {
        const sumFees = txpool.reduce((acc, el) => {
            return acc + el.payload.miner_fee;
        }, 0);
        // TODO: remove hardcoded!!
        const blockReward = 10;
        // const revChain = this.getReverseChain(chain);
        const to = this.createAccountOperation(
            keypair.publicKey,
            sumFees + blockReward,
            chain,
            txpool
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
        chain: BlockType[],
        txpool: AccountTransactionType[]
    ): BlockType {
        const coinbase = this.createCoinbaseTransaction(keypair, chain, txpool);
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
                index,
                timestamp: Date.now(),
                nonce: 0,
                previous_hash,
                coinbase,
                txs: txpool,
            },
        };
    }

    private tryAddBlock(chain: BlockType[], block: BlockType) {
        this.verifyBlock(chain, block);
        chain[block.payload.index] = block;
    }

    private verifyBlock(chain: BlockType[], block: BlockType) {
        // const revChain = this.getReverseChain(chain, block.payload.index);
        const partialChain = chain.slice(0, block.payload.index);

        // TODO: REMOVE HARDCODED COMPLEXITY!!
        this.verifyBlockPayloadHash(block, 19);
        this.verifyIncludedPrevBlockHash(chain, block);
        this.verifyBlockCoinbaseSignature(block);
        this.verifyBlockTimestamps(chain, block);
        // this.verifyNoDupeRefWithinBlock(block);
        this.verifyOperationAgainstPoolOrChain(
            block.payload.coinbase.payload.to,
            partialChain,
            block.payload.txs
        );
        this.verifyBlockTransactions(block, partialChain);
        // TODO: REMOVE HARDCODED BLOCK REWARD!!
        this.verifyBlockFullRewardBalance(block, 10);
    }

    private verifyOperation(txOp: AccountOperationType, chain: BlockType[]) {
        if (txOp.op_nonce === 0) this.verifyZeroNonceOperation(txOp, chain);
        else this.verifyNonZeroNonceOperation(txOp, chain);
    }

    private verifyZeroNonceOperation(
        txOp: AccountOperationType,
        chain: BlockType[]
    ) {
        if (txOp.operation !== txOp.updated_balance)
            throw new Error("bad first account tx balance");
        const lastOp = this.retrieveLastAccountOperation(txOp.address, chain);
        if (lastOp) throw new Error("found prior operation on account");
    }

    private verifyNonZeroNonceOperation(
        txOp: AccountOperationType,
        chain: BlockType[]
    ) {
        const lastOp = this.retrieveLastAccountOperation(txOp.address, chain);
        if (!lastOp)
            throw new Error(
                "operation nonce is not null but no record of last operation"
            );
        this.verifyOperationCongruence(lastOp, txOp);
    }

    private retrieveLastAccountOperation(
        publicKey: string,
        chain: BlockType[]
    ): AccountOperationType | null {
        for (let i = chain.length - 1; i >= 0; --i) {
            const block = chain[i];
            if (block.payload.coinbase.payload.to.address === publicKey)
                return block.payload.coinbase.payload.to;
            for (let i = block.payload.txs.length - 1; i >= 0; --i) {
                const tx = block.payload.txs[i];
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
        chain: BlockType[],
        txpool: AccountTransactionType[]
    ) {
        this.verifyTransactionAgainstPoolOrChain(tx, chain, txpool);
    }

    private verifyOperationCongruence(
        prev: AccountOperationType,
        cur: AccountOperationType
    ) {
        if (prev.address != cur.address) throw new Error("different address");
        if (prev.op_nonce + 1 !== cur.op_nonce)
            throw new Error(
                `bad op nonce: ${prev.op_nonce} + 1 !== ${cur.op_nonce}`
            );
        if (prev.updated_balance + cur.operation !== cur.updated_balance)
            throw new Error("bad updated balance");
    }

    private verifyTransactionPoolAgainstBlockchain(
        txpool: AccountTransactionType[],
        chain: BlockType[]
    ) {
        _.forEachRight(txpool, (tx, index) => {
            this.verifyTransactionAgainstPoolOrChain(
                tx,
                chain,
                txpool.slice(0, index)
            );
        });
    }

    private verifyTransactionAgainstPoolOrChain(
        tx: AccountTransactionType,
        chain: BlockType[],
        txpool: AccountTransactionType[]
    ) {
        this.verifyOperationSign(tx.payload.from, "from");
        this.verifyOperationSign(tx.payload.to, "to");
        this.verifyTransactionOperationsBalance(tx);
        this.verifyNoNegativeBalanceInTransaction(tx);
        this.verifyOperationAgainstPoolOrChain(tx.payload.from, chain, txpool);
        this.verifyOperationAgainstPoolOrChain(tx.payload.to, chain, txpool);
        this.verifyTransactionSignature(tx);
    }

    private verifyOperationAgainstPoolOrChain(
        op: AccountOperationType,
        chain: BlockType[],
        txpool: AccountTransactionType[]
    ) {
        const res = this.retrieveLastAccountOperationInTxPool(
            op.address,
            txpool
        );
        if (res) {
            this.verifyOperationCongruence(res.op, op);
        } else {
            this.verifyOperation(op, chain);
        }
    }

    private retrieveLastAccountOperationInTxPool(
        publicKey: string,
        txs: AccountTransactionType[]
    ): { index: number; op: AccountOperationType } | null {
        // reverse iteration
        const length = txs.length;
        for (let i = length - 1; i >= 0; --i) {
            const tx = txs[i];
            if (tx.payload.from.address === publicKey)
                return { index: i, op: tx.payload.from };
            if (tx.payload.to.address === publicKey)
                return { index: i, op: tx.payload.to };
        }
        return null;
    }

    private verifyTransactionSignature(tx: AccountTransactionType) {
        // console.log("CHECKING SIG", tx.header.signature);
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

    private verifyBlockTransactions(block: BlockType, chain: BlockType[]) {
        // for (const tx of block.payload.txs) {
        //     this.verifyTransaction(tx, revChain);
        // }
        this.verifyTransactionPoolAgainstBlockchain(block.payload.txs, chain);
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
