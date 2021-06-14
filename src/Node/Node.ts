import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import { genKeyPair } from "../Encryption/Encryption";
import { dig } from "../utils";
import _ from "lodash";

import { Block } from "../Block/Block";
import {
    SignedTransaction,
    InitialTransaction,
    Input,
    Output,
} from "../Transactions/Transactions";

export class Node {
    public blockchain: Block[];
    public pendingTransactions: Array<SignedTransaction | InitialTransaction>;
    public keypair: KeyPairKeyObjectResult;

    constructor(blockchain?: Block[]) {
        this.blockchain = blockchain ?? [];
        this.pendingTransactions = [];
    }

    createInitialTransaction(keypair: KeyPairKeyObjectResult, amount: number) {
        const initTx = new InitialTransaction({
            outputs: [{ to: keypair.publicKey, amount }],
            timestamp: Date.now(),
        });
        this.validateTransactionData(initTx);
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

    createSignedTransaction(tx: SignedTransaction, privateKey: KeyObject) {
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
        this.broadcastTransaction(txProcessed);
    }

    validateTransactionData(tx: SignedTransaction | InitialTransaction): void {
        if (tx instanceof SignedTransaction) {
            this.validateTransactionSignature(tx);
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

    validateTransactionSignature(tx: SignedTransaction): void {
        if (!tx.isValid())
            throw new Error(
                "transaction creation error: invalid transaction signature"
            );
    }

    broadcastTransaction(tx: SignedTransaction | InitialTransaction) {
        this.pendingTransactions.push(tx);
    }

    mineBlock() {
        if (this.pendingTransactions.length === 0) return;
        let block = new Block();
        this.pendingTransactions.sort((a, b) => b.timestamp - a.timestamp);
        block.transactions.unshift(...this.pendingTransactions);
        this.pendingTransactions = [];
        this.blockchain.unshift(block);
    }

    // printBlockchain() {
    //     console.log(
    //         JSON.stringify(
    //             this.blockchain.slice().map((block) => {
    //                 block.transactions = block.transactions.map((tx) =>
    //                     JSON.parse(tx.serialize())
    //                 );
    //                 return block;
    //             }),
    //             null,
    //             2
    //         )
    //     );
    // }
}
