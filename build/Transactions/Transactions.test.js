"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Encryption_1 = require("../Encryption/Encryption");
var Transactions_1 = require("./Transactions");
describe("SignedTransaction class", function () {
    var account1;
    var account2;
    beforeEach(function () {
        account1 = Encryption_1.genKeyPair();
        account2 = Encryption_1.genKeyPair();
    });
    test("getting total output amount", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });
        expect(tx.getTotalAmount()).toEqual(3);
        tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [
                { to: account2.publicKey, amount: 3 },
                { to: Encryption_1.genKeyPair().publicKey, amount: 8 },
                { to: Encryption_1.genKeyPair().publicKey, amount: 2 },
            ],
        });
        expect(tx.getTotalAmount()).toEqual(13);
    });
    test("make signable object", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });
        expect(tx.makeSignableObject().timestamp).toBeDefined();
    });
    test("signing-verifying", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });
        expect(tx.isValid()).toBeFalsy();
        expect(tx.serialize).toThrowError();
        tx.sign(account2.privateKey);
        expect(tx.isValid()).toBeFalsy();
        tx.sign(account1.privateKey);
        expect(tx.isValid()).toBeTruthy();
    });
    test("serial-deserial then signing-verifying", function () {
        var tx = new Transactions_1.SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });
        tx.sign(account1.privateKey);
        var deserializedTx = new Transactions_1.SignedTransaction(tx.serialize());
        expect(deserializedTx.isValid()).toBeTruthy();
        deserializedTx.sign(account1.privateKey);
        expect(deserializedTx.isValid()).toBeTruthy();
        deserializedTx.sign(account2.privateKey);
        expect(deserializedTx.isValid()).toBeFalsy();
    });
});
