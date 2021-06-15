import {
    InitialTransaction,
    SignedTransaction,
} from "../Transactions/Transactions";
import { Block } from "../Block/Block";

type MessageTypes = "INIT_TX" | "SIGNED_TX" | "BLOCK";

export interface Message<T> {
    type: MessageTypes;
    data: T extends "INIT_TX"
        ? InitialTransaction
        : T extends "SIGNED_TX"
        ? SignedTransaction
        : T extends "BLOCK"
        ? Block
        : any;
}
