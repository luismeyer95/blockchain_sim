import { BlockType, Block, IBlock } from "src/Interfaces/IBlock";
import { IBlockchain } from "src/Interfaces/IBlockchain";
import {
    AccountTransaction,
    AccountTransactionType,
} from "src/Interfaces/IAccountTransaction";
import { AccountOperationType } from "src/Interfaces/IAccountOperation";
import {
    hash,
    verify,
    hashSatisfiesComplexity,
    deserializeKey,
} from "src/Encryption/Encryption";

export class Blockchain implements IBlockchain {
    private chain: BlockType[];

    constructor() {}

    getLastBlockIndex() {
        return this.chain.length - 1;
    }

    getBlockRange(range: [number, number]): IBlock[] {
        const blocks = this.chain.filter(
            (block) =>
                block.payload.index >= range[0] &&
                block.payload.index <= range[1]
        );
        return blocks.map((block) => new Block(block));
    }

    private isAppendable(blockArr: IBlock[]) {
        const rangeFirstIndex = blockArr[0].getBlockIndex();
        return !(this.getLastBlockIndex() + 1 < rangeFirstIndex);
    }

    submitBlockRange(blockArr: IBlock[]) {
        if (blockArr.length === 0)
            throw new Error("empty block array submission");

        const backupChain = this.chain.slice();
        try {
            blockArr.forEach((block) => {
                this.tryAddBlock(block.pure() as BlockType);
            });
        } catch {
            this.chain = backupChain;
            return false;
        }
        return true;
    }

    private tryAddBlock(block: BlockType) {
        const blockIndex = block.payload.index;
        if (this.getLastBlockIndex() + 1 < blockIndex)
            throw new Error("missing blocks");
        // return missing block detail instead of throwing
    }

    private verifyBlockIndexContinuity(block: BlockType): boolean {
        const blockIndex = block.payload.index;
        return !(this.getLastBlockIndex() + 1 < blockIndex);
    }

    private verifyBlockPayloadHash(
        block: BlockType,
        complexity: number
    ): boolean {
        const payloadString = JSON.stringify(block.payload);
        const hashed = hash(Buffer.from(payloadString));
        const base64hash = hashed.digest("base64");
        const isGold = hashSatisfiesComplexity(payloadString, complexity);
        return isGold.success && base64hash === block.header.hash;
    }

    private verifyIncludedPrevBlockHash(block: BlockType): boolean {
        const prevHash = block.payload.previous_hash;
        const blockIndex = block.payload.index;
        if (blockIndex === 0) {
            return prevHash === null;
        } else {
            const prevBlock = this.getPreviousBlock(block);
            if (prevBlock) {
                const localPrevHash = prevBlock.header.hash;
                return prevHash === localPrevHash;
            } else {
                throw new Error("error: did not check for block continuity");
                // should NOT happen
            }
        }
    }

    private verifyBlockTimestamps(block: BlockType) {
        const prevBlock = this.getPreviousBlock(block);
        if (prevBlock) {
            const blockCheck =
                prevBlock.payload.timestamp < block.payload.timestamp &&
                block.payload.timestamp < Date.now();
            const coinbaseTimestamp = block.payload.coinbase.payload.timestamp;
            const coinbaseCheck =
                prevBlock.payload.timestamp < coinbaseTimestamp &&
                coinbaseTimestamp < Date.now();
            return blockCheck && coinbaseCheck;
        }
        throw new Error("error: did not check for block continuity");
    }

    private getPreviousBlock(block: BlockType): BlockType | null {
        const blockIndex = block.payload.index;
        if (blockIndex === 0 || this.chain.length < blockIndex) return null;
        return this.chain[blockIndex - 1];
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
        return verify(coinbasePayload, publicKeyMiner, coinbaseSig);
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

    private getReverseChain(stopIndex: number) {
        return this.chain
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
        const chain = revChain;
        for (const block of chain) {
            for (const tx of block.payload.txs) {
                this.verifyNoDupeLastRefInBlockchainTx(tx, publicKey, lastRef);
                if (tx.header.signature === lastRef) {
                    return tx;
                }
            }
        }
        throw new Error("last reference not found");
    }

    private verifyNoDupeRefWithinBlock(block: BlockType) {}

    private verifyNoPriorTxOnAccount(publicKey: string, chain: BlockType[]) {
        for (const block of chain) {
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
        chain: BlockType[]
    ) {
        this.verifyNoPriorTxOnAccount(txOp.address, chain);
    }

    private verifyNonNullLastRefOperation(
        txOp: AccountOperationType,
        chain: BlockType[]
    ) {
        const refTx = this.retrieveLastReferencedTx(
            txOp.address,
            txOp.last_ref!,
            chain
        );
        const lastBalance = this.extractBalanceOfAccountFromTx(
            refTx,
            txOp.address
        );
        // if (lastBalance)
    }

    private verifyTransaction(tx: AccountTransactionType, chain: BlockType[]) {
        if (tx.payload.from.last_ref === null)
            throw new Error("source account of tx has null last ref");
        this.verifyTransactionSignature(tx);
        this.verifyUnicityAcrossDestinationAccountsOfTx(tx);
        this.verifyTransactionOperationsBalance(tx);
        tx.payload.to.forEach((txOp) => {
            if (txOp.last_ref === null) {
                this.verifyNullLastRefOperation(txOp, chain);
            } else {
                this.verifyNonNullLastRefOperation(txOp, chain);
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

    private verifyBlockTransactions(block: BlockType) {
        const chain = this.getReverseChain(this.chain.length);
        try {
            for (const tx of block.payload.txs) {
                this.verifyTransaction(tx, chain);
            }
            return true;
        } catch {
            return false;
        }
    }

    getTransactionCtor() {
        return AccountTransaction;
    }

    getBlockCtor() {
        return Block;
    }
}
