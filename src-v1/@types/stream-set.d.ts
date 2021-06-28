declare module "stream-set" {
    import events from "events";
    import { Socket } from "net";

    declare class StreamSet extends events.EventEmitter {
        constructor();
        forEach(
            fn: (stream: Socket, index: number, self: Socket[]) => void
        ): void;
        get(index: number): Socket;
        has(sock: Socket): boolean;
        remove(sock: Socket): Socket;
        add(sock: Socket): Socket;
    }

    export default StreamSet;
}
