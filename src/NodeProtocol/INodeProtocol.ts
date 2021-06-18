import EventEmitter from "events";
import { Block } from "src/Block/Block";
import INodeNet from "src/NodeNet/INodeNet";
import {
    SignedTransaction,
    InitialTransaction,
} from "src/Transactions/Transactions";

export type INodeProtocolObjects =
    | Block
    | Block[]
    | InitialTransaction
    | SignedTransaction;

export default interface INodeProtocol extends EventEmitter {
    // pass object data from the Node to the Protocol

    process(message: INodeProtocolObjects): void;

    // onBlock(callback: (item: Block) => void): void;
    // onBlockchain(callback: (item: Block[]) => void): void;
    // onSignedTransaction(callback: (item: SignedTransaction) => void): void;
    // onInitialTransaction(callback: (item: InitialTransaction) => void): void;
}
