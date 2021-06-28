export default interface INodeProtocol {
    request(
        type: string,
        peer: string,
        respHandler: (data: string) => void
    ): void;
    onRequest(type: string, callback: (peer: string) => string): void;

    broadcast(type: string, data: string): any;
    onBroadcast(
        type: string,
        callback: (data: string, peer: string) => void
    ): void;
}
