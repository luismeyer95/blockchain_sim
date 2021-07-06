declare module "end-of-stream" {
    import { Socket } from "net";
    declare function eos(stream: Socket, cb: () => void): void;
    export default eos;
}
