import { EventEmitter } from "events";

type NodeEvents =
    | "broadcast initial tx"
    | "broadcast signed tx"
    | "broadcast block"
    | "broadcast blockchain"
    | "broadcast protocol payload"
    | "receive initial tx"
    | "receive signed tx"
    | "receive block"
    | "receive blockchain";

export interface INodeEventBus {
    on: (event: NodeEvents, callback: (...args: any[]) => void) => void;
}
