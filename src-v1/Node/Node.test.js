"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Encryption_1 = require("../Encryption/Encryption");
var Transactions_1 = require("../Transactions/Transactions");
var Node_1 = require("./Node");
describe("Node class tests", function () {
    var account1;
    var account2;
    var node;
    beforeEach(function () {
        account1 = Encryption_1.genKeyPair();
        account2 = Encryption_1.genKeyPair();
        node = new Node_1.Node();
    });
    test("empty mining", function () {
        node.mineBlock();
        expect(node.blockchain.length).toEqual(0);
    });
    test("passing a blockchain to constructor", function () {
        node.createInitialTransaction(account1, 10);
        node.mineBlock();
        var other = new Node_1.Node(node.blockchain);
        expect(node.blockchain).toEqual(other.blockchain);
    });
    test("initial blockchain tx", function () {
        node.createInitialTransaction(account1, 10);
        node.mineBlock();
        expect(node.blockchain.length).toEqual(1);
        expect(node.blockchain[0].transactions.length).toEqual(1);
        expect(node.blockchain[0].transactions[0]).toBeInstanceOf(Transactions_1.InitialTransaction);
        expect(node.blockchain[0].transactions[0].output.to).toBe(account1.publicKey);
    });
    test("ltxo", function () {
        expect(node.findLastTransactionOutput(account1.publicKey)).toBeNull();
        node.createInitialTransaction(account1, 12);
        node.mineBlock();
        expect(node.findLastTransactionOutput(account1.publicKey)).toEqual({
            to: account1.publicKey,
            amount: 12,
            balance: 12,
        });
        var tx = new Transactions_1.SignedTransaction({
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
    test("signed transaction", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });
        expect(node.createSignedTransaction.bind(node, tx, account1.privateKey)).toThrowError();
        expect(node.validateTransactionAgainstBlockchain.bind(node, tx)).toThrowError();
        node.createInitialTransaction(account1, 10);
        node.mineBlock();
        expect(node.createSignedTransaction.bind(node, tx, account2.privateKey)).toThrowError();
        node.createSignedTransaction(tx, account1.privateKey);
        node.mineBlock();
    });
    test("overspending ltxo", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 15 }],
        });
        node.createInitialTransaction(account1, 12);
        node.mineBlock();
        expect(node.findLastTransactionOutput(tx.input.from).amount).toEqual(12);
        tx.sign(account1.privateKey);
        expect(node.validateTransactionAgainstBlockchain.bind(node, tx)).toThrowError();
    });
    test("underspending ltxo", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 12 }],
        });
        node.createInitialTransaction(account1, 15);
        node.mineBlock();
        tx.sign(account1.privateKey);
        expect(node.validateTransactionAgainstBlockchain.bind(node, tx)).toThrowError();
    });
    test("bad tx", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [
                { to: account2.publicKey, amount: 15 },
                { to: account1.publicKey, amount: -3 },
            ],
        });
        node.createInitialTransaction(account1, 12);
        node.mineBlock();
        expect(node.createSignedTransaction.bind(node, tx, account1.privateKey)).toThrowError();
    });
    test("multiple initial txs for a single account", function () {
        node.createInitialTransaction(account1, 12);
        node.mineBlock();
        expect(node.createInitialTransaction.bind(node, account1, 12)).toThrowError();
    });
    test("spending non-existent ltxo", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 15 }],
        });
        tx.sign(account1.privateKey);
        expect(node.validateTransactionAgainstBlockchain.bind(node, tx)).toThrowError();
    });
    test("multiple pending txs of same input address", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });
        node.createInitialTransaction(account1, 10);
        node.mineBlock();
        node.createSignedTransaction(tx, account1.privateKey);
        expect(node.createSignedTransaction.bind(node, tx, account1.privateKey)).toThrowError();
    });
    test("multiple initial transactions to same address in pending txs", function () {
        node.createInitialTransaction(account1, 10);
        expect(node.createInitialTransaction.bind(node, account1, 10)).toThrowError();
    });
    test("multiple references of single address in pending txs", function () {
        node.createInitialTransaction(account1, 10);
        node.mineBlock();
        node.createInitialTransaction(account2, 10);
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });
        expect(node.createSignedTransaction.bind(node, tx, account1.privateKey)).toThrowError();
    });
    test("multiple signed transactions", function () {
        node.createInitialTransaction(account1, 10);
        node.mineBlock();
        node.createSignedTransaction(new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        }), account1.privateKey);
        node.mineBlock();
        expect(node.findLastTransactionOutput(account1.publicKey).balance).toBe(7);
        node.createSignedTransaction(new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 5 }],
        }), account1.privateKey);
        node.mineBlock();
        expect(node.findLastTransactionOutput(account1.publicKey).balance).toBe(2);
        node.createSignedTransaction(new Transactions_1.SignedTransaction({
            input: { from: account2.publicKey },
            outputs: [{ to: account1.publicKey, amount: 1 }],
        }), account2.privateKey);
        node.mineBlock();
        expect(node.findLastTransactionOutput(account1.publicKey).balance).toBe(3);
    });
});
