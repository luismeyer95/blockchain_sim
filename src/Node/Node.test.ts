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
        node = new Node();
    });

    test("empty mining", () => {
        node.mineBlock();
        expect(node.blockchain.length).toEqual(0);
    });

    test("passing a blockchain to constructor", () => {
        node.createInitialTransaction(account1, 10);
        node.mineBlock();

        const other: Node = new Node(node.blockchain);

        expect(node.blockchain).toEqual(other.blockchain);
    });

    test("initial blockchain tx", () => {
        node.createInitialTransaction(account1, 10);
        node.mineBlock();

        expect(node.blockchain.length).toEqual(1);
        expect(node.blockchain[0].transactions.length).toEqual(1);
        expect(node.blockchain[0].transactions[0]).toBeInstanceOf(
            InitialTransaction
        );
        expect(
            (node.blockchain[0].transactions[0] as InitialTransaction).output.to
        ).toBe(account1.publicKey);
    });

    test("ltxo", () => {
        expect(node.findLastTransactionOutput(account1.publicKey)).toBeNull();

        node.createInitialTransaction(account1, 12);
        node.mineBlock();

        expect(node.findLastTransactionOutput(account1.publicKey)).toEqual({
            to: account1.publicKey,
            amount: 12,
            balance: 12,
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
            balance: 9,
        });
    });

    test("signed transaction", () => {
        const tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });

        expect(
            node.createSignedTransaction.bind(node, tx, account1.privateKey)
        ).toThrowError();
        expect(
            node.validateTransactionAgainstBlockchain.bind(node, tx)
        ).toThrowError();

        node.createInitialTransaction(account1, 10);
        node.mineBlock();

        expect(
            node.createSignedTransaction.bind(node, tx, account2.privateKey)
        ).toThrowError();

        node.createSignedTransaction(tx, account1.privateKey);
        node.mineBlock();
    });

    test("overspending ltxo", () => {
        const tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 15 }],
        });
        node.createInitialTransaction(account1, 12);
        node.mineBlock();
        expect(node.findLastTransactionOutput(tx.input.from)!.amount).toEqual(
            12
        );

        tx.sign(account1.privateKey);

        expect(
            node.validateTransactionAgainstBlockchain.bind(node, tx)
        ).toThrowError();
    });

    test("underspending ltxo", () => {
        const tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 12 }],
        });
        node.createInitialTransaction(account1, 15);
        node.mineBlock();

        tx.sign(account1.privateKey);
        expect(
            node.validateTransactionAgainstBlockchain.bind(node, tx)
        ).toThrowError();
    });

    test("bad tx", () => {
        const tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [
                { to: account2.publicKey, amount: 15 },
                { to: account1.publicKey, amount: -3 },
            ],
        });
        node.createInitialTransaction(account1, 12);
        node.mineBlock();

        tx.sign(account1.privateKey);

        expect(
            node.validateTransactionAgainstBlockchain.bind(node, tx)
        ).toThrowError();
    });

    test("multiple initial txs for a single account", () => {
        node.createInitialTransaction(account1, 12);
        node.mineBlock();

        expect(
            node.createInitialTransaction.bind(node, account1, 12)
        ).toThrowError();
    });

    test("spending non-existent ltxo", () => {
        const tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 15 }],
        });
        tx.sign(account1.privateKey);
        expect(
            node.validateTransactionAgainstBlockchain.bind(node, tx)
        ).toThrowError();
    });

    test("multiple pending txs of same input address", () => {
        const tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });

        node.createInitialTransaction(account1, 10);
        node.mineBlock();

        node.createSignedTransaction(tx, account1.privateKey);
        expect(
            node.createSignedTransaction.bind(node, tx, account1.privateKey)
        ).toThrowError();
    });

    test("multiple initial transactions to same address in pending txs", () => {
        node.createInitialTransaction(account1, 10);

        expect(
            node.createInitialTransaction.bind(node, account1, 10)
        ).toThrowError();
    });

    test("multiple references of single address in pending txs", () => {
        node.createInitialTransaction(account1, 10);
        node.mineBlock();

        node.createInitialTransaction(account2, 10);

        const tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });

        expect(
            node.createSignedTransaction.bind(node, tx, account1.privateKey)
        ).toThrowError();
    });

    test("multiple signed transactions", () => {
        node.createInitialTransaction(account1, 10);
        node.mineBlock();

        node.createSignedTransaction(
            new SignedTransaction({
                input: { from: account1.publicKey },
                outputs: [{ to: account2.publicKey, amount: 3 }],
            }),
            account1.privateKey
        );
        node.mineBlock();

        expect(
            node.findLastTransactionOutput(account1.publicKey)!.balance
        ).toBe(7);

        node.createSignedTransaction(
            new SignedTransaction({
                input: { from: account1.publicKey },
                outputs: [{ to: account2.publicKey, amount: 5 }],
            }),
            account1.privateKey
        );
        node.mineBlock();

        expect(
            node.findLastTransactionOutput(account1.publicKey)!.balance
        ).toBe(2);

        node.createSignedTransaction(
            new SignedTransaction({
                input: { from: account2.publicKey },
                outputs: [{ to: account1.publicKey, amount: 1 }],
            }),
            account2.privateKey
        );
        node.mineBlock();

        expect(
            node.findLastTransactionOutput(account1.publicKey)!.balance
        ).toBe(3);
    });
});
