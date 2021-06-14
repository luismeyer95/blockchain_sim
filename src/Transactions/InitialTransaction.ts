import { KeyObject } from "crypto";
import type { Input, Output } from "./InputOutput";
import {
    serializeKey,
    Base64SerializedKey,
    deserializeKey,
} from "../Encryption/Encryption";

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
        const { outputs, timestamp } = JSON.parse(tx);
        this.outputs = outputs.map((output: Output<Base64SerializedKey>) => {
            return {
                to: deserializeKey(output.to, "public"),
                amount: output.amount,
            };
        });
        this.timestamp = timestamp;
        // the following operation defines the asymmetricKeyType
        // and restores the og state for some reason
        this.outputs.forEach((output) => {
            output.to.asymmetricKeyType;
        });
    }
}
