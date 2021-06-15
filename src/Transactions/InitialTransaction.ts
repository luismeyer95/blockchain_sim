import { KeyObject } from "crypto";
import type { Input, Output } from "./InputOutput";
import {
    serializeKey,
    Base64SerializedKey,
    deserializeKey,
    keyEquals,
} from "../Encryption/Encryption";

interface IInitialTransaction {
    output: Output<KeyObject>;
    timestamp: number;
}

export class InitialTransaction implements IInitialTransaction {
    public output: Output<KeyObject>;
    public timestamp: number;

    constructor(tx: IInitialTransaction | string) {
        if (typeof tx === "string") {
            this.deserialize(tx);
        } else {
            this.output = tx.output;
            this.timestamp = tx.timestamp;
        }
    }

    serialize(...args: any): string {
        const output: Output<Base64SerializedKey> = {
            to: serializeKey(this.output.to),
            amount: this.output.amount,
            balance: this.output.balance,
        };
        const timestamp = this.timestamp;
        return JSON.stringify({ output, timestamp }, ...args);
    }

    deserialize(tx: string): void {
        const { output, timestamp } = JSON.parse(tx);
        this.output = {
            to: deserializeKey(output.to, "public"),
            amount: output.amount,
            balance: output.balance,
        };
        this.timestamp = timestamp;
    }

    containsAddress(key: KeyObject) {
        if (keyEquals(key, this.output.to)) return true;
    }
}
