import EventEmitter from "events";
import { Block } from "src/Block/Block";
import { InitialTransaction } from "src/Transactions/InitialTransaction";
import { SignedTransaction } from "src/Transactions/SignedTransaction";

import net, { Socket } from "net";
import StreamSet from "stream-set";
import Topology from "src/Network/Sockets";
import register from "register-multicast-dns";
import toPort from "hash-to-port";

import { v4 as generateUUID } from "uuid";

function toAddress(name: string) {
    return name + ".local:" + toPort(name);
}

export default class ChatP2P {
    public id: string;
    public peerIds: string[] = [];
    public swarm: Topology;
    public streams: StreamSet;
    private defaultId: string = "default";

    constructor() {
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
        process.stdout.write(`${this.shortenId(this.id)}> `);
    }

    public shortenId(id: string) {
        return id.slice(0, this.defaultId.length);
    }

    public getDataHook() {
        return (data: Buffer) => {
            const message = JSON.stringify({
                type: "MESSAGE",
                payload: `${this.shortenId(this.id)}> ${data.toString()}`,
            });
            this.streams.forEach((stream) => {
                stream.write(message);
            });
            process.stdout.write(`${this.shortenId(this.id)}> `);
        };
    }

    private tryListen(id: string, peerIds: string[], fallback?: () => void) {
        this.id = id; // defaultId or generateUUID()
        register(this.id);
        this.swarm = new Topology(
            toAddress(this.id),
            peerIds.map(toAddress),
            fallback
        );
        this.setSwarmCallbacks();
    }

    private setSwarmCallbacks() {
        this.swarm.on("listening", this.onListen.bind(this));
        this.swarm.on("connection", this.onConnection.bind(this));
    }

    private onListen() {
        this.log(`[listening on ${toAddress(this.id)}]\n`);
    }

    private onConnection(newPeer: Socket, peerAddress: string) {
        this.log(`[${peerAddress} joined]\n`);
        // add comm socket to set
        this.streams.add(newPeer);
        // add string id of peer only if it's not already there and not my id
        const peerId = peerAddress.substr(0, peerAddress.indexOf("."));
        if (!this.peerIds.find((id) => id === peerId))
            this.peerIds.push(peerId);
        // send peer table
        newPeer.write(
            JSON.stringify({ type: "PEER_TABLE", payload: this.peerIds })
        );
        newPeer.on("data", (data) => {
            const obj = JSON.parse(data.toString());
            if (obj.type === "PEER_TABLE") {
                this.log(`[received ${peerAddress}'s peer table]\n`);
                const table = obj.payload;
                // only keep received table entries that are not in my table and
                // that don't reference myself
                const unknownPeers = table.filter(
                    (peerId: string) =>
                        !this.peerIds.includes(peerId) && peerId !== this.id
                );
                unknownPeers.forEach((peerId: string) => {
                    this.peerIds.push(peerId);
                    this.log(`[adding ${toAddress(peerId)} to swarm]\n`);
                    this.swarm.add(toAddress(peerId));
                });
            } else if (obj.type === "MESSAGE") this.log(obj.payload);
        });
        newPeer.on("close", () => {
            this.log(`[${peerAddress} left]\n`);
            this.peerIds = this.peerIds.filter(
                (id) => toAddress(id) !== peerAddress
            );
        });
    }
}
