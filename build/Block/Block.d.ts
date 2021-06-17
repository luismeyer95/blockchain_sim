/// <reference types="node" />
import { SignedTransaction } from "../Transactions/SignedTransaction";
import { InitialTransaction } from "../Transactions/InitialTransaction";
export declare class Block {
    timestamp?: number;
    nonce: number;
    hash?: Buffer;
    previousHash?: Buffer;
    transactions: Array<SignedTransaction | InitialTransaction>;
    constructor();
    serialize(): string;
    mine(nonce: number, leadingZeroBits: number): boolean;
}
