/// <reference types="node" />
import { KeyObject } from "crypto";
import type { Output } from "./InputOutput";
interface IInitialTransaction {
    output: Output<KeyObject>;
    timestamp: number;
}
export declare class InitialTransaction implements IInitialTransaction {
    output: Output<KeyObject>;
    timestamp: number;
    constructor(tx: IInitialTransaction | string);
    serialize(...args: any): string;
    deserialize(tx: string): void;
    containsAddress(key: KeyObject): true | undefined;
}
export {};
