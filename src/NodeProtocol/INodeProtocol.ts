import EventEmitter from "events";
import { Block } from "src/Block/Block";
import INodeNet from "src/NodeNet/INodeNet";
import {
    SignedTransaction,
    InitialTransaction,
} from "src/Transactions/Transactions";

export type INodeProtocolObjects =
    | Block
    // | Block[]
    | InitialTransaction
    | SignedTransaction;

export default interface INodeProtocol {
    // pass object data from the Node to the Protocol

    createMessage(resource: INodeProtocolObjects): unknown;
    interpretMessage(payload: unknown): INodeProtocolObjects | null;
}
