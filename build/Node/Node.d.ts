/// <reference types="node" />
import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import { Block } from "../Block/Block";
import { SignedTransaction, InitialTransaction, Output } from "../Transactions/Transactions";
export declare class Node {
    blockchain: Block[];
    pendingTransactions: Array<SignedTransaction | InitialTransaction>;
    keypair: KeyPairKeyObjectResult;
    constructor(blockchain?: Block[]);
    createInitialTransaction(keypair: KeyPairKeyObjectResult, amount: number): void;
    createSignedTransaction(tx: SignedTransaction, privateKey: KeyObject): void;
    collectTransaction(tx: InitialTransaction | SignedTransaction): void;
    validateTransaction(tx: InitialTransaction | SignedTransaction): void;
    validateTxAddressUnicityInPendingTxs(tx: SignedTransaction | InitialTransaction): void;
    validateTransactionAgainstBlockchain(tx: SignedTransaction | InitialTransaction): void;
    validateTransactionData(tx: SignedTransaction): void;
    findLastTransactionOutput(publicKey: KeyObject): Output<KeyObject> | null;
    mineBlock(): void;
    printBlockchain(): void;
}
