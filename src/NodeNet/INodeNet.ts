import EventEmitter from "events";
import { Block } from "src/Block/Block";
import { InitialTransaction } from "src/Transactions/InitialTransaction";
import { SignedTransaction } from "src/Transactions/SignedTransaction";

export default interface INodeNet extends EventEmitter {
    broadcast(message: unknown): void;
}
