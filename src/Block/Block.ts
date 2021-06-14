import { SignedTransaction } from "../Transactions/SignedTransaction";
import { InitialTransaction } from "../Transactions/InitialTransaction";

export class Block {
    public timestamp?: number;
    public nonce?: number;
    public hash?: Buffer;
    public previousHash?: Buffer;
    public transactions: Array<SignedTransaction | InitialTransaction>;

    constructor() {
        this.transactions = [];
    }
}
