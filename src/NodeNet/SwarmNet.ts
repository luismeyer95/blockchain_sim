import EventEmitter from "events";
import { Block } from "src/Block/Block";
import { InitialTransaction } from "src/Transactions/InitialTransaction";
import { SignedTransaction } from "src/Transactions/SignedTransaction";
import INodeNet from "./INodeNet";

import net, { Socket } from "net";
import StreamSet from "stream-set";
import Topology from "src/Network/Sockets";
import register from "register-multicast-dns";
import toPort from "hash-to-port";

import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";

import { v4 as generateUUID } from "uuid";
import INodeProtocol from "src/NodeProtocol/INodeProtocol";
import NodeProtocol from "src/NodeProtocol/NodeProtocol";

import { z } from "zod";

function IdToAddress(name: string) {
    return name + ".local:" + toPort(name);
}

function addressToId(addr: string) {
    return addr.substr(0, addr.indexOf("."));
}

const NetworkMessage = z.object({
    peer: z.object({
        type: z.string(),
        table: z.string().array(),
    }),
});

const Payload = z.object({
    payload: z.any().refine((p) => p !== undefined),
});

type NetworkMessage = z.infer<typeof NetworkMessage>;
type Payload = z.infer<typeof Payload>;

export default class SwarmNet extends EventEmitter implements INodeNet {
    public id: string;
    public peerIds: string[] = [];
    public swarm: Topology;
    public streams: StreamSet;
    private defaultId: string = "default";

    private log: ILogger;

    constructor(logger: ILogger = log) {
        super();
        this.log = logger;
        this.streams = new StreamSet();
        const fallback = () => {
            this.tryListen(generateUUID(), [this.defaultId], fallback);
        };
        this.tryListen(this.defaultId, [], fallback);
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

    private sendPeerTable(peer: Socket) {
        const peerTableMsg: NetworkMessage = {
            peer: {
                type: "peer_table",
                table: this.peerIds,
            },
        };
        this.send(peerTableMsg, peer);
    }

    private processNetworkMessage(
        obj: unknown,
        peer: Socket,
        peerAddress: string
    ) {
        let netValidation = NetworkMessage.safeParse(obj);

        if (netValidation.success) {
            if (netValidation.data.peer.type === "peer_table") {
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
    }

    private processPayload(obj: unknown) {
        let payloadValidation = Payload.safeParse(obj);
        if (payloadValidation.success) {
            this.emit("payload", payloadValidation.data.payload);
        }
    }

    private updatePeerTable(peerAddress: string) {
        // add string id of peer only if it's not already there and not my id
        const peerId = addressToId(peerAddress);
        if (!this.peerIds.find((id) => id === peerId))
            this.peerIds.push(peerId);
    }

    private onConnection(newPeer: Socket, peerAddress: string) {
        this.emit("connection");
        const shid = this.shortenId(addressToId(peerAddress));
        this.log(`[${shid} joined]\n`);
        // add comm socket to set
        this.streams.add(newPeer);
        this.updatePeerTable(peerAddress);
        this.sendPeerTable(newPeer);
        newPeer.on("data", (data: Buffer) => {
            this.log(`[received data from peer ${shid}]\n`);
            const strdata: string = data.toString();
            const obj: unknown = JSON.parse(strdata);
            this.processNetworkMessage(obj, newPeer, peerAddress);
            this.processPayload(obj);
        });
        newPeer.on("close", () => {
            this.peerIds = this.peerIds.filter(
                (id) => IdToAddress(id) !== peerAddress
            );
        });
    }

    broadcast(payload: unknown): void {
        const message: Payload = { payload };
        this.streams.forEach((stream) => {
            this.send(message, stream);
        });
    }

    private send(message: Payload | NetworkMessage, peer: Socket) {
        peer.write(JSON.stringify(message));
    }
}
