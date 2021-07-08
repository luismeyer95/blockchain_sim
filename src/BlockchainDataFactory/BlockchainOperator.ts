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
    BlockRangeValidationResult,
} from "src/Interfaces/IBlockchainOperator";
import { fromPairs, last, sum } from "lodash";
import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import { CoinbaseTransactionType } from "./ICoinbaseTransaction";

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
            timestamp: Date.now(),
            to,
        };
        const payloadBuf = Buffer.from(JSON.stringify(payload));
        const signature = sign(payloadBuf, keypair.privateKey).toString(
            "base64"
        );
        return {
            header: {
                signature,
            },
            payload,
        };
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
    // throws
    private verifyLastRefNotAlreadyReferenced(
        publicKey: string,
        lastRef: string,
        revChain: BlockType[]
    ) {
        for (const block of revChain) {
            for (const tx of block.payload.txs) {
                this.verifyNoDupeLastRefInBlockchainTx(tx, publicKey, lastRef);
            }
        }
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

    private getReverseChain(
        chain: BlockType[],
        stopIndex: number = chain.length
    ) {
        return chain
            .slice()
            .filter((block) => block.payload.index < stopIndex)
            .reverse();
    }

    private retrieveLastAccountOperation(
        publicKey: string,
        revChain: BlockType[]
    ): {
        op: IAccountOperation;
        ref: string;
    } | null {
        for (const block of revChain) {
            if (block.payload.coinbase.payload.to.address === publicKey)
                return {
                    op: block.payload.coinbase.payload.to,
                    ref: block.payload.coinbase.header.signature,
                };
            for (const tx of block.payload.txs) {
                if (tx.payload.from.address === publicKey)
                    return { op: tx.payload.from, ref: tx.header.signature };
                for (const output of tx.payload.to) {
                    if (output.address === publicKey)
                        return { op: output, ref: tx.header.signature };
                }
            }
        }
        return null;
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
        this.verifyLastRefNotAlreadyReferenced(
            txOp.address,
            txOp.last_ref!,
            revChain
        );
        const result = this.retrieveLastAccountOperation(
            txOp.address,
            revChain
        );
        if (!result)
            throw new Error(
                "operation ref is not null but no record of last operation"
            );
        const { op: lastOp, ref } = result;
        if (ref !== txOp.last_ref) throw new Error("bad last ref");
        if (lastOp.updated_balance + txOp.operation !== txOp.updated_balance)
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
        this.verifyNoNegativeBalanceInTransaction(tx);
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

    private verifyNoNegativeBalanceInTransaction(tx: AccountTransactionType) {
        const err = new Error("negative balance for transaction");
        tx.payload.to.forEach((op) => {
            if (op.updated_balance < 0) throw err;
        });
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
