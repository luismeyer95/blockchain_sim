import INodeNet from "src/Interfaces/INodeNet";
import EventEmitter from "events";
import net, { Socket } from "net";
import StreamSet from "stream-set";
import Topology from "src/Topology/Topology";
import register from "register-multicast-dns";
import toPort from "hash-to-port";
import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";
import { v4 as generateUUID } from "uuid";
import { z } from "zod";
import eos from "end-of-stream";
import jsonStream, { JSONSocket } from "duplex-json-stream";

function IdToAddress(name: string) {
    return name + ".local:" + toPort(name);
}

function addressToId(addr: string) {
    return addr.substr(0, addr.indexOf("."));
}

const PeerTableInfo = z.object({
    peer: z.object({
        table: z.string().array(),
    }),
});

const Payload = z.object({
    payload: z.any().refine((p) => p !== undefined),
});

type PeerTableInfo = z.infer<typeof PeerTableInfo>;
type Payload = z.infer<typeof Payload>;

class PeerSet extends EventEmitter {
    public peers: {
        id: string;
        socket: Socket;
    }[] = [];

    constructor() {
        super();
        this.peers = [];
    }

    has(stream: Socket) {
        const found = this.peers.find((peer) => peer.socket === stream);
        return !!found;
    }

    get(handle: Socket | string) {
        if (typeof handle === "string")
            return this.peers.find((peer) => peer.id === handle);
        return this.peers.find((peer) => peer.socket === handle);
    }

    forEach(fn: (peer: { socket: Socket; id: string }) => any) {
        this.peers.forEach(fn);
    }

    remove(stream: Socket) {
        const found = this.peers.find((peer) => peer.socket === stream);
        if (!found) return;
        const index = this.peers.indexOf(found);
        this.peers.splice(index, 1);
        this.emit("remove", stream);
    }

    add(socket: Socket, id: string) {
        if (this.has(socket)) return socket;
        this.peers.push({ socket, id });
        eos(socket, () => {
            this.remove(socket);
        });
        this.emit("add", socket);
        return socket;
    }
}

export class NodeNet extends EventEmitter implements INodeNet {
    public id: string;
    public peerIds: string[] = [];
    public swarm: Topology;
    // public streams: StreamSet;
    public peers: PeerSet;

    private defaultId: string = "default";

    private log: ILogger;

    constructor(logger: ILogger = log) {
        super();
        this.log = logger;
        this.peers = new PeerSet();

        const fallback = () => {
            this.tryListen(generateUUID(), [this.defaultId], fallback);
        };
        this.tryListen(this.defaultId, [], fallback);
    }

    broadcast(message: string): void {
        const netMessage: Payload = {
            payload: message,
        };
        this.peers.forEach(({ socket }) => {
            socket.write(JSON.stringify(netMessage));
        });
    }

    send(peer: string, data: string): void {
        const foundPeer = this.peers.get(peer);
        if (foundPeer) {
            const netMessage: Payload = {
                payload: data,
            };
            foundPeer.socket.write(JSON.stringify(netMessage));
        } else {
            throw new Error(
                "NodeNet.send(): peer id not matching to any entry"
            );
        }
    }

    receive(callback: (peer: string, data: string) => void): void {
        this.on("payload", callback);
    }

    public shortenId(id: string) {
        return id.slice(0, this.defaultId.length);
    }

    private tryListen(id: string, peerIds: string[], fallback?: () => void) {
        this.id = id; // defaultId or generateUUID()
        register(this.id);
        this.swarm = new Topology(
            IdToAddress(this.id),
            peerIds.map(IdToAddress),
            fallback
        );
        this.setSwarmCallbacks();
    }

    private setSwarmCallbacks() {
        this.swarm.on("listening", this.onListen.bind(this));
        this.swarm.on("connection", this.onConnection.bind(this));
    }

    private onListen() {
        this.log(`[listening on ${IdToAddress(this.id)}]\n`);
    }

    private onConnection(newPeer: Socket, peerAddress: string) {
        const jsons = jsonStream(newPeer);

        this.emit("connection");
        const shid = this.shortenId(addressToId(peerAddress));
        this.log(`[${shid} joined]\n`);

        // add comm socket to set
        // this.streams.add(newPeer);
        this.peers.add(newPeer, peerAddress);

        this.updatePeerTable(peerAddress);
        this.sendPeerTable(newPeer);
        this.subscribeToPeerEvents(newPeer, peerAddress);
    }

    private subscribeToPeerEvents(newPeer: Socket, peerAddress: string) {
        const shid = this.shortenId(addressToId(peerAddress));

        newPeer.on("data", (data: Buffer) => {
            this.log(`[received data from peer ${shid}]\n`);
            const strdata: string = data.toString();
            console.log("BRUH", strdata, "BRUH");
            const obj: unknown = JSON.parse(strdata);
            this.processMessageNetworkInfo(obj, peerAddress);
            this.processPayload(obj, peerAddress);
        });
        newPeer.on("close", () => {
            this.peerIds = this.peerIds.filter(
                (id) => IdToAddress(id) !== peerAddress
            );
        });
    }

    private updatePeerTable(peerAddress: string) {
        // add string id of peer only if it's not already there and not my id
        const peerId = addressToId(peerAddress);
        if (!this.peerIds.find((id) => id === peerId))
            this.peerIds.push(peerId);
    }

    private sendPeerTable(peer: Socket) {
        const peerTableMsg: PeerTableInfo = {
            peer: {
                table: this.peerIds,
            },
        };
        peer.write(JSON.stringify(peerTableMsg));
    }

    private processMessageNetworkInfo(obj: unknown, peerAddress: string) {
        let netValidation = PeerTableInfo.safeParse(obj);

        if (netValidation.success) {
            const shid = this.shortenId(addressToId(peerAddress));
            this.log(`[received ${shid}'s peer table]\n`);
            const table = netValidation.data.peer.table;
            // only keep received table entries that are not in my table and
            // that don't reference myself
            const unknownPeers = table.filter(
                (peerId: string) =>
                    !this.peerIds.includes(peerId) && peerId !== this.id
            );
            unknownPeers.forEach((peerId: string) => {
                this.peerIds.push(peerId);
                this.log(`[adding ${this.shortenId(peerId)} to swarm]\n`);
                this.swarm.add(IdToAddress(peerId));
            });
        }
    }

    private processPayload(obj: unknown, peerAddress: string) {
        let payloadValidation = Payload.safeParse(obj);
        if (payloadValidation.success) {
            this.emit("payload", peerAddress, payloadValidation.data.payload);
        }
    }
}
