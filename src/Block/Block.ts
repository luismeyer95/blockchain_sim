import { SignedTransaction } from "../Transactions/SignedTransaction";
import { InitialTransaction } from "../Transactions/InitialTransaction";
import { findNonce, hash } from "../Encryption/Encryption";
import ISerializable from "src/Serializable/ISerializable";

export interface IBlock {
    timestamp?: number;
    nonce: number;
    hash?: Buffer;
    previousHash?: Buffer;
    transactions: Array<SignedTransaction | InitialTransaction>;
}

export class Block implements IBlock, ISerializable {
    public timestamp?: number;
    public nonce: number = 0;
    public hash?: Buffer;
    public previousHash?: Buffer;
    public transactions: Array<SignedTransaction | InitialTransaction>;

    constructor(block?: IBlock) {
        this.timestamp = block?.timestamp;
        this.nonce = block?.nonce ?? 0;
        this.hash = block?.hash;
        this.timestamp = block?.timestamp;
        this.transactions = block?.transactions ?? [];
    }

    serialize(): string {
        const obj = {
            timestamp: this.timestamp,
            nonce: this.nonce,
            hash: this.hash?.toString("base64"),
            previousHash: this.previousHash?.toString("base64"),
            transactions: this.transactions.map((tx) => tx.serialize()),
        };
        return JSON.stringify(obj);
    }

    deserialize(json: string): void {
        try {
            const { timestamp, nonce, hash, previousHash, transactions } =
                JSON.parse(json);
            this.timestamp = timestamp;
            this.nonce = nonce;
            this.hash = Buffer.from(hash, "base64");
            this.previousHash = Buffer.from(previousHash, "base64");
            this.transactions = transactions.map((tx: string) => {
                if (SignedTransaction.isSignedTransaction(tx))
                    return new SignedTransaction(tx);
                return new InitialTransaction(tx);
            });
        } catch {
            console.error("block deserialize error");
        }
    }

    mine(nonce: number, leadingZeroBits: number): boolean {
        if (leadingZeroBits < 0 || leadingZeroBits > 32)
            throw new Error(
                "findNonce error: invalid leadingZeroBits argument"
            );

        const bitstr = "0".repeat(32 - leadingZeroBits).padStart(32, "1");
        const bitnum = parseInt(bitstr, 2);

        const hashRes = hash(Buffer.from(JSON.stringify(this)));
        const buf = hashRes.copy().digest();
        const u32 = buf.readUInt32BE();
        return !(u32 & bitnum);
    }

    // static isBlock(obj: any): obj is Block {
    //     let ret =
    //         (obj.timestamp === undefined ||
    //             typeof obj.timestamp === "number") &&
    //         typeof obj.nonce === "number" &&
    //         (Buffer.isBuffer(obj.hash) || obj.hash === undefined) &&
    //         (Buffer.isBuffer(obj.previousHash) ||
    //             obj.previousHash === undefined) &&
    //         Array.isArray(obj.transactions);

    //     if (!ret) return false;

    //     obj.transactions.forEach((tx: any) => {
    //         if (
    //             !InitialTransaction.isInitialTransaction(tx) &&
    //             !SignedTransaction.isSignedTransaction(tx)
    //         )
    //             ret = false;
    //     });
    //     return ret;
    // }

    // static isBlockchain(obj: any): obj is Block[] {
    //     if (!Array.isArray(obj)) return false;
    //     let ret = true;
    //     obj.forEach((block: any) => {
    //         if (!Block.isBlock(block)) ret = false;
    //     });
    //     return ret;
    // }
}
