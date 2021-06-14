import { KeyPairKeyObjectResult } from "crypto";
import { genKeyPair } from "../Encryption/Encryption";
import {
    SignedTransaction,
    InitialTransaction,
    Input,
    Output,
} from "./Transactions";

describe("SignedTransaction class", () => {
    let account1: KeyPairKeyObjectResult;
    let account2: KeyPairKeyObjectResult;

    beforeEach(() => {
        account1 = genKeyPair();
        account2 = genKeyPair();
    });

    test("getting total output amount", () => {
        let tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });

        expect(tx.getTotalAmount()).toEqual(3);

        tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [
                { to: account2.publicKey, amount: 3 },
                { to: genKeyPair().publicKey, amount: 8 },
                { to: genKeyPair().publicKey, amount: 2 },
            ],
        });

        expect(tx.getTotalAmount()).toEqual(13);
    });

    test("make signable object", () => {
        let tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });

        expect(tx.makeSignableObject().timestamp).toBeDefined();
    });

    test("signing-verifying", () => {
        let tx = new SignedTransaction({
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

    test("serial-deserial then signing-verifying", () => {
        let tx = new SignedTransaction({
            input: { from: account1.publicKey },
            outputs: [{ to: account2.publicKey, amount: 3 }],
        });

        tx.sign(account1.privateKey);
        let deserializedTx = new SignedTransaction(tx.serialize());

        expect(deserializedTx.isValid()).toBeTruthy();
        deserializedTx.sign(account1.privateKey);
        expect(deserializedTx.isValid()).toBeTruthy();
        deserializedTx.sign(account2.privateKey);
        expect(deserializedTx.isValid()).toBeFalsy();
    });
});

describe("InitialTransaction class", () => {
    let account1: KeyPairKeyObjectResult;

    beforeEach(() => {
        account1 = genKeyPair();
    });

    test("serial-deserial then signing-verifying", () => {
        let tx = new InitialTransaction({
            outputs: [{ to: account1.publicKey, amount: 36 }],
            timestamp: Date.now(),
        });

        let deserializedTx = new InitialTransaction(tx.serialize());

        expect(deserializedTx.outputs).toEqual(tx.outputs);
        expect(deserializedTx.timestamp).toEqual(tx.timestamp);
    });
});
