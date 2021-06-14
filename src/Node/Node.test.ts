import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import { genKeyPair } from "../Encryption/Encryption";
import {
    SignedTransaction,
    InitialTransaction,
    Input,
    Output,
} from "../Transactions/Transactions";
import { Node } from "./Node";

describe("Node class tests", () => {
    let account1: KeyPairKeyObjectResult;
    let account2: KeyPairKeyObjectResult;
    let node: Node;

    beforeEach(() => {
        account1 = genKeyPair();
        account2 = genKeyPair();
    });

    test("empty mining", () => {
        node = new Node();
        node.mineBlock();
        expect(node.blockchain.length).toEqual(0);
    });

    test("initial blockchain tx", () => {
        node = new Node();

        node.createInitialTransaction(account1, 10);
        node.mineBlock();

        expect(node.blockchain.length).toEqual(1);
        expect(node.blockchain[0].transactions.length).toEqual(1);
        expect(node.blockchain[0].transactions[0].outputs.length).toEqual(1);
        expect(node.blockchain[0].transactions[0].outputs[0].to).toBe(
            account1.publicKey
        );
    });

    test("ltxo", () => {
        node = new Node();
        expect(node.findLastTransactionOutput(account1.publicKey)).toBeNull();

        node.createInitialTransaction(account1, 12);
        node.mineBlock();

        expect(node.findLastTransactionOutput(account1.publicKey)).toEqual({
            to: account1.publicKey,
            amount: 12,
        });

        const tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });

        node.createSignedTransaction(tx, account1.privateKey);
        node.mineBlock();

        expect(node.findLastTransactionOutput(account1.publicKey)).toEqual({
            to: account1.publicKey,
            amount: 9,
        });
    });

    test("signed transaction", () => {
        node = new Node();

        const tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });

        expect(
            node.createSignedTransaction.bind(node, tx, account1.privateKey)
        ).toThrowError();

        node.createInitialTransaction(account1, 10);
        node.mineBlock();

        expect(
            node.createSignedTransaction.bind(node, tx, account2.privateKey)
        ).toThrowError();

        node.createSignedTransaction(tx, account1.privateKey);
        node.mineBlock();
    });
});
