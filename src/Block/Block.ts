import { SignedTransaction } from "../Transactions/SignedTransaction";
import { InitialTransaction } from "../Transactions/InitialTransaction";
import { findNonce, hash } from "../Encryption/Encryption";

export class Block {
    public timestamp?: number;
    public nonce: number = 0;
    public hash?: Buffer;
    public previousHash?: Buffer;
    public transactions: Array<SignedTransaction | InitialTransaction>;

    constructor() {
        this.transactions = [];
    }

    serialize(): string {
        return "";
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
}
