declare module "duplex-json-stream" {
    import events from "events";
    import { Socket } from "net";
    import ndjson from "ndjson";

    declare function jsonStream(
        socket: Socket
    ): ReturnType<typeof ndjson.parse>;
    export default jsonStream;
    export type JSONSocket = ReturnType<typeof ndjson.parse>;
}
