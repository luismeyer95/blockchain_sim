// declare module "fully-connected-topology" {
//     import { Socket } from "net";

//     export type Topology = {
//         on(
//             event: "connection",
//             callback: (conn: Socket, addr: string) => void
//         ): void;

//         add(peer: string);
//         remove(peer: string);
//         destroy(): void;
//         peer(addr: string): Socket;

//         connections: Socket[];
//     };

//     function topology(addr: string, peerAddr: string[]): Topology;

//     export default topology;
// }
