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
    // protocol: z.any()
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

    constructor(protocol?: INodeProtocol) {
        super();
        this.streams = new StreamSet();
        const fallback = () => {
            this.tryListen(generateUUID(), [this.defaultId], fallback);
        };
        this.tryListen(this.defaultId, [], fallback);
    }

    log(data: string): void {
        process.stdout.clearLine(-1); // clear current text
        process.stdout.cursorTo(0);
        process.stdout.write(data);
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
        this.log(`[${peerAddress} joined]\n`);

        this.emit("connection");
        // add comm socket to set
        this.streams.add(newPeer);
        // add string id of peer only if it's not already there and not my id
        const peerId = addressToId(peerAddress);
        if (!this.peerIds.find((id) => id === peerId))
            this.peerIds.push(peerId);
        // send peer table
        const peerTableMsg: NetworkMessage = {
            peer: {
                type: "PEER_TABLE",
                table: this.peerIds,
            },
        };
        newPeer.write(JSON.stringify(peerTableMsg));
        newPeer.on("data", (data: Buffer) => {
            this.log("[received data from peer]\n");
            const strdata: string = data.toString();
            const obj: unknown = JSON.parse(strdata);

            let netValidation = NetworkMessage.safeParse(obj);

            if (netValidation.success) {
                if (netValidation.data.peer.type === "PEER_TABLE") {
                    // console.log("is unknown?");
                    this.log(`[received ${peerAddress}'s peer table]\n`);
                    const table = netValidation.data.peer.table;
                    // only keep received table entries that are not in my table and
                    // that don't reference myself
                    const unknownPeers = table.filter(
                        (peerId: string) =>
                            !this.peerIds.includes(peerId) && peerId !== this.id
                    );
                    unknownPeers.forEach((peerId: string) => {
                        this.peerIds.push(peerId);
                        this.log(`[adding ${IdToAddress(peerId)} to swarm]\n`);
                        this.swarm.add(IdToAddress(peerId));
                    });
                }
            }

            let payloadValidation = Payload.safeParse(obj);
            if (payloadValidation.success) {
                this.emit("payload", payloadValidation.data.payload);
            }
            // only keep received table entries that are not in my table and
            // that don't reference myself
        });
        newPeer.on("close", () => {
            this.peerIds = this.peerIds.filter(
                (id) => IdToAddress(id) !== peerAddress
            );
        });
    }

    broadcast(payload: unknown): void {
        // this.log(`streams = ${this.streams}\n`);
        const message: Payload = { payload };
        this.streams.forEach((stream) => {
            stream.write(JSON.stringify(message));
        });
    }
}
