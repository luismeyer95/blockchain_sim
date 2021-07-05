import EventEmitter from "events";

export default interface INodeNet {
    broadcast(message: string): void;
    send(peer: string, data: string): void;
    receive(callback: (peer: string, data: string) => void): void;
}
