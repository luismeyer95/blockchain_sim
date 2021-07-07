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
import jsonStream, { JSONSocket } from "duplex-json-stream";
import { hash } from "src/Encryption/Encryption";

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
    payload: z.string(),
});

type PeerTableInfo = z.infer<typeof PeerTableInfo>;
type Payload = z.infer<typeof Payload>;

class PeerSet extends EventEmitter {
    public peers: {
        addr: string;
        socket: JSONSocket;
    }[] = [];

    constructor() {
        super();
        this.peers = [];
    }

    has(stream: JSONSocket) {
        const found = this.peers.find((peer) => peer.socket === stream);
        return !!found;
    }

    get(handle: JSONSocket | string) {
        if (typeof handle === "string")
            return this.peers.find((peer) => peer.addr === handle);
        return this.peers.find((peer) => peer.socket === handle);
    }

    forEach(fn: (peer: { socket: JSONSocket; addr: string }) => any) {
        this.peers.forEach(fn);
    }

    rm(stream: JSONSocket) {
        const found = this.peers.find((peer) => peer.socket === stream);
        if (!found) return;
        const index = this.peers.indexOf(found);
        this.peers.splice(index, 1);
        this.emit("remove", found);
    }

    add(socket: JSONSocket, addr: string) {
        if (this.has(socket)) return socket;
        const peer = { socket, addr };
        this.peers.push(peer);
        socket.on("close", () => {
            this.rm(socket);
        });
        this.emit("add", peer);
        return socket;
    }
}

export class NodeNet extends EventEmitter implements INodeNet {
    public id: string;
    public peerTable: string[] = [];
    public swarm: Topology;
    // public streams: StreamSet;
    public peers: PeerSet;
    private msgCache: Set<string> = new Set<string>();

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
        this.emit("connection");
        const shid = this.shortenAddr(peerAddress);
        this.log(`[${shid} joined]\n`);

        // add comm socket to set
        // this.streams.add(newPeer);
        const jsonPeer = jsonStream(newPeer);
        this.peers.add(jsonPeer, peerAddress);

        if (this.isUnknownPeer(peerAddress)) this.peerTable.push(peerAddress);
        this.sendPeerTable(jsonPeer);
        this.subscribeToPeerEvents(jsonPeer, peerAddress);
    }

    private isUnknownPeer = (peerAddress: string): boolean => {
        return !this.peerTable.find(
            (addr) => addr === peerAddress && addr !== IdToAddress(this.id)
        );
    };

    private sendPeerTable(peer: JSONSocket) {
        const peerTableMsg: PeerTableInfo = {
            peer: {
                table: this.peerTable,
            },
        };
        peer.write(peerTableMsg);
    }

    private subscribeToPeerEvents(jsonPeer: JSONSocket, peerAddress: string) {
        const shid = this.shortenAddr(peerAddress);

        jsonPeer.on("data", (obj: unknown) => {
            this.log(`[received data from peer ${shid}]\n`);
            this.processMessageNetworkInfo(obj, peerAddress);
            this.processPayload(obj, peerAddress);
        });

        jsonPeer.on("close", () => {
            this.log(`[disconnect: ${shid}]\n`);
        });
    }

    private processMessageNetworkInfo(obj: unknown, peerAddress: string) {
        let netValidation = PeerTableInfo.safeParse(obj);

        if (netValidation.success) {
            const shid = this.shortenAddr(peerAddress);
            this.log(`[received ${shid}'s peer table]\n`);
            const table = netValidation.data.peer.table;
            // only keep received table entries that are not in my table and
            // that don't reference myself
            const unknownPeers = table.filter(this.isUnknownPeer);
            unknownPeers.forEach((addr: string) => {
                this.peerTable.push(addr);
                this.swarm.add(addr);
                this.log(`[adding ${this.shortenAddr(addr)} to swarm]\n`);
            });
        }
    }

    private processPayload(obj: unknown, peerAddress: string) {
        let payloadValidation = Payload.safeParse(obj);
        if (payloadValidation.success) {
            const payload = payloadValidation.data.payload;

            const payloadHash = hash(Buffer.from(payload))
                .digest()
                .toString("base64");
            if (this.msgCache.has(payloadHash)) return;
            this.msgCache.add(payloadHash);
            setTimeout(() => {
                this.msgCache.delete(payloadHash);
            }, 60 * 1000);

            this.emit("payload", peerAddress, payload);
        }
    }

    broadcast(message: string): void {
        const netMessage: Payload = {
            payload: message,
        };

        const payloadHash = hash(Buffer.from(message))
            .digest()
            .toString("base64");
        this.msgCache.add(payloadHash);

        this.peers.forEach(({ socket }) => {
            socket.write(netMessage);
        });
    }

    send(peer: string, data: string): void {
        const foundPeer = this.peers.get(peer);
        if (foundPeer) {
            const netMessage: Payload = {
                payload: data,
            };
            foundPeer.socket.write(netMessage);
        } else {
            throw new Error(
                "NodeNet.send(): peer id not matching to any entry"
            );
        }
    }

    receive(callback: (peer: string, data: string) => void): void {
        this.on("payload", callback);
    }

    public shortenAddr(addr: string) {
        const id = addressToId(addr);
        return id.slice(0, this.defaultId.length);
    }
}
