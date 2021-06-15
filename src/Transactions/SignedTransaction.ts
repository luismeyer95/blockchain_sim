import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import type { Input, Output } from "./InputOutput";
import {
    sign,
    verify,
    serializeKey,
    Base64SerializedKey,
    deserializeKey,
    keyEquals,
} from "../Encryption/Encryption";

export interface ISignedTransaction {
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
        let validOutputs: boolean = true;
        this.outputs.forEach((output: Output<KeyObject>) => {
            if (output.amount < 0) validOutputs = false;
            if (output.balance && output.balance < 0) validOutputs = false;
        });
        const signable = this.makeSignableObject();
        return (
            validOutputs &&
            verify(
                Buffer.from(JSON.stringify(signable)),
                this.input.from,
                this.signature
            )
        );
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
                    balance: output.balance,
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
        if (!this.isValid()) {
            const strerror =
                "transaction error: trying to serialize invalid transaction";
            throw new Error(strerror);
        }
        const signable = this.makeSignableObject();
        const signature = this.signature!.toString("base64");
        return JSON.stringify({ ...signable, signature }, ...args);
    }

    deserialize(tx: string): void {
        const { input, outputs, signature, timestamp } = JSON.parse(tx);
        this.input = { from: deserializeKey(input.from, "public") };
        this.outputs = outputs.map((output: Output<Base64SerializedKey>) => {
            return {
                to: deserializeKey(output.to, "public"),
                amount: output.amount,
                balance: output.balance,
            };
        });
        this.signature = Buffer.from(signature, "base64");
        if (!timestamp)
            throw new Error("transaction deserialize error: no timestamp");
        this.timestamp = timestamp;
    }

    containsAddress(key: KeyObject): boolean {
        if (keyEquals(key, this.input.from)) return true;
        let ret: boolean = false;
        this.outputs.forEach((output) => {
            if (keyEquals(key, output.to)) ret = true;
        });
        return ret;
    }
}
