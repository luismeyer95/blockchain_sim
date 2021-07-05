export default interface INodeProtocol {
    requestBlocks(
        range: [number, number],
        peer: string,
        respHandler: (data: string) => void
    ): void;
    onBlocksRequest(
        callback: (range: [number, number], peer: string) => string
    ): void;

    broadcast(type: string, data: string): any;
    onBroadcast(
        type: string,
        callback: (data: string, peer: string) => void
    ): void;
}
