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
    });
    test("empty mining", function () {
        node = new Node_1.Node();
        node.mineBlock();
        expect(node.blockchain.length).toEqual(0);
    });
    test("initial blockchain tx", function () {
        node = new Node_1.Node();
        node.createInitialTransaction(account1, 10);
        node.mineBlock();
        expect(node.blockchain.length).toEqual(1);
        expect(node.blockchain[0].transactions.length).toEqual(1);
        expect(node.blockchain[0].transactions[0].outputs.length).toEqual(1);
        expect(node.blockchain[0].transactions[0].outputs[0].to).toBe(account1.publicKey);
    });
    test("ltxo", function () {
        node = new Node_1.Node();
        expect(node.findLastTransactionOutput(account1.publicKey)).toBeNull();
        node.createInitialTransaction(account1, 12);
        node.mineBlock();
        expect(node.findLastTransactionOutput(account1.publicKey)).toEqual({
            to: account1.publicKey,
            amount: 12,
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
        });
    });
    test("signed transaction", function () {
        node = new Node_1.Node();
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });
        expect(node.createSignedTransaction.bind(node, tx, account1.privateKey)).toThrowError();
        node.createInitialTransaction(account1, 10);
        node.mineBlock();
        expect(node.createSignedTransaction.bind(node, tx, account2.privateKey)).toThrowError();
        // node.createSignedTransaction(tx, account1.privateKey);
        // node.mineBlock();
        // node.printBlockchain();
    });
});
