/// <reference types="node" />
import { KeyObject } from "crypto";
import type { Input, Output } from "./InputOutput";
export interface ISignedTransaction {
    input: Input<KeyObject>;
    outputs: Output<KeyObject>[];
    signature?: Buffer;
    timestamp?: number;
}
export declare class SignedTransaction implements ISignedTransaction {
    input: Input<KeyObject>;
    outputs: Output<KeyObject>[];
    signature?: Buffer;
    timestamp: number;
    constructor(tx: ISignedTransaction | string);
    isValid(): boolean;
    makeSignableObject(): {
        input: Input<string>;
        outputs: Output<string>[];
        timestamp: number;
    };
    getTotalAmount(): number;
    sign(privateKey: KeyObject): void;
    serialize(...args: any): string;
    deserialize(tx: string): void;
    containsAddress(key: KeyObject): boolean;
}
