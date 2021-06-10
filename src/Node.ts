import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import {
    genKeyPair,
    sign,
    verify,
    serializeKey,
    deserializeKeyPair,
    Base64SerializedKey,
    serializeKeyPair,
    deserializeKey,
} from "./RSAEncryption";
import crypto from "crypto";
import { dig } from "./utils";
import _ from "lodash";
import { time } from "console";
import { exit } from "process";

type Input<T> = { from: T };
type Output<T> = { to: T; amount: number };

interface ISignedTransaction {
    input: Input<KeyObject>;
    outputs: Output<KeyObject>[];
    signature?: Buffer;
    timestamp?: number;
}

export class SignedTransaction implements ISignedTransaction {
    public input: Input<KeyObject>;
    public outputs: Output<KeyObject>[];
    public signature?: Buffer;
    public timestamp: number;

    constructor(tx: ISignedTransaction | string) {
        if (typeof tx === "string") {
            this.deserialize(tx);
        } else {
            this.input = tx.input;
            this.outputs = tx.outputs;
            this.signature = tx.signature;
            this.timestamp = tx.timestamp || Date.now();
        }
    }

    isValid(): boolean {
        if (!this.signature) return false;
        const signable = this.makeSignableObject();
        return verify(
            Buffer.from(JSON.stringify(signable)),
            this.input.from,
            this.signature
        );
    }

    test() {
        const input: Input<Base64SerializedKey> = {
            from: serializeKey(this.input.from),
        };
    }

    makeSignableObject() {
        const input: Input<Base64SerializedKey> = {
            from: serializeKey(this.input.from),
        };
        const outputs: Output<Base64SerializedKey>[] = this.outputs
            .slice()
            .map((output: Output<KeyObject>) => {
                return {
                    to: serializeKey(output.to),
                    amount: output.amount,
                };
            });
        const timestamp = this.timestamp;
        return { input, outputs, timestamp };
    }

    getTotalAmount(): number {
        let fullAmount: number = 0;
        this.outputs.forEach(
            (output: Output<KeyObject>) => (fullAmount += output.amount)
        );
        return fullAmount;
    }

    sign(privateKey: KeyObject) {
        this.signature = sign(
            Buffer.from(JSON.stringify(this.makeSignableObject())),
            privateKey
        );
    }

    serialize(...args: any): string {
        if (!this.isValid())
            throw new Error(
                "transaction error: trying to serialize invalid transaction"
            );
        const signable = this.makeSignableObject();
        const signature = this.signature?.toString("base64");
        return JSON.stringify({ ...signable, signature }, ...args);
    }

    deserialize(tx: string): void {
        const { input, outputs, signature, timestamp } = JSON.parse(tx);
        this.input = { from: deserializeKey(input.from, "public") };
        this.outputs = outputs.map((output: Output<Base64SerializedKey>) => {
            return {
                to: deserializeKey(output.to, "public"),
                amount: output.amount,
            };
        });
        this.signature = Buffer.from(signature, "base64");
        if (!timestamp)
            throw new Error("transaction deserialize error: no timestamp");
        this.timestamp = timestamp;
    }
}

interface IInitialTransaction {
    outputs: Output<KeyObject>[];
    timestamp: number;
}

export class InitialTransaction implements IInitialTransaction {
    public outputs: Output<KeyObject>[];
    public timestamp: number;

    constructor(tx: IInitialTransaction | string) {
        if (typeof tx === "string") {
            this.deserialize(tx);
        } else {
            this.outputs = tx.outputs;
            this.timestamp = tx.timestamp;
        }
    }

    serialize(...args: any): string {
        const outputs: Output<Base64SerializedKey>[] = this.outputs
            .slice()
            .map((output: Output<KeyObject>) => {
                return {
                    to: serializeKey(output.to),
                    amount: output.amount,
                } as Output<Base64SerializedKey>;
            });
        const timestamp = this.timestamp;
        return JSON.stringify({ outputs, timestamp }, ...args);
    }

    deserialize(tx: string): void {
        const { outputs, timestamp } = JSON.parse(tx) as IInitialTransaction;
        this.outputs = outputs;
        this.timestamp = timestamp;
    }
}

class Block {
    public timestamp?: number;
    public nonce?: number;
    public hash?: Buffer;
    public previousHash?: Buffer;
    public transactions: Array<SignedTransaction | InitialTransaction>;

    constructor() {
        this.transactions = [];
    }
}

export class Node {
    public blockchain: Block[];
    public pendingTransactions: Array<SignedTransaction | InitialTransaction>;
    public keypair: KeyPairKeyObjectResult;

    constructor(keypair: KeyPairKeyObjectResult = genKeyPair()) {
        this.blockchain = [];
        this.pendingTransactions = [];
        this.keypair = keypair;
        if (!this.findLastTransactionOutput(keypair.publicKey))
            this.createInitialTransaction(this.keypair, 10);
    }

    createInitialTransaction(keypair: KeyPairKeyObjectResult, amount: number) {
        const initTx = new InitialTransaction({
            outputs: [{ to: keypair.publicKey, amount }],
            timestamp: Date.now(),
        });
        this.validateTransactionData(initTx);
        this.validateTransactionSignature(initTx);
        this.broadcastTransaction(initTx);
    }

    findLastTransactionOutput(
        publicKey: KeyObject
    ): Output<KeyObject> | undefined {
        const output: Output<KeyObject> | undefined = dig(
            this.blockchain,
            (block) =>
                dig(block.transactions, (tx) =>
                    dig(tx.outputs, (output) => {
                        if (output.to === publicKey) return output;
                    })
                )
        );
        return output;
    }

    signAndCreateTransaction(tx: SignedTransaction, privateKey: KeyObject) {
        const lastOutput = this.findLastTransactionOutput(tx.input.from);
        if (!lastOutput) {
            throw new Error(
                "transaction error: missing last transaction output"
            );
        }
        const txProcessed: SignedTransaction = tx;
        txProcessed.outputs.push({
            to: tx.input.from,
            amount: lastOutput.amount - tx.getTotalAmount(),
        });
        txProcessed.sign(privateKey);
        this.validateTransactionData(txProcessed);
        this.validateTransactionSignature(txProcessed);
        this.broadcastTransaction(txProcessed);
    }

    validateTransactionData(tx: SignedTransaction | InitialTransaction): void {
        if (tx instanceof SignedTransaction) {
            const lastOutput = this.findLastTransactionOutput(tx.input.from);
            if (lastOutput) {
                if (tx.getTotalAmount() > lastOutput.amount)
                    throw new Error(
                        "transaction error: insufficient account funds"
                    );
                if (tx.getTotalAmount() < lastOutput.amount)
                    throw new Error("transaction error: unspent input");
            } else {
                throw new Error("transaction error: no funds on this account");
            }
        } else {
            tx.outputs.forEach((output) => {
                const lastOutput = this.findLastTransactionOutput(output.to);
                if (lastOutput)
                    throw new Error(
                        "transaction error: cannot create initial transaction on funded account"
                    );
            });
        }
    }

    validateTransactionSignature(
        tx: SignedTransaction | InitialTransaction
    ): void {
        if (tx instanceof InitialTransaction) {
            return;
        } else {
            if (!tx.isValid())
                throw new Error(
                    "transaction creation error: invalid transaction signature"
                );
        }
    }

    broadcastTransaction(tx: SignedTransaction | InitialTransaction) {
        this.pendingTransactions.push(tx);
    }

    mineBlock() {
        let block = new Block();
        this.pendingTransactions.sort((a, b) => b.timestamp - a.timestamp);
        block.transactions.unshift(...this.pendingTransactions);
        this.pendingTransactions = [];
        this.blockchain.unshift(block);
    }

    printBlockchain() {
        console.log(
            JSON.stringify(
                this.blockchain.slice().map((block) => {
                    block.transactions = block.transactions.map((tx) =>
                        JSON.parse(tx.serialize())
                    );
                    return block;
                }),
                null,
                2
            )
        );
    }
}
