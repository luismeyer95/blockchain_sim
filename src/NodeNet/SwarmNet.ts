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

function IdToAddress(name: string) {
    return name + ".local:" + toPort(name);
}

function addressToId(addr: string) {
    return addr.substr(0, addr.indexOf("."));
}

const log = (data: string): void => {
    process.stdout.clearLine(-1); // clear current text
    process.stdout.cursorTo(0);
    process.stdout.write(data);
    // process.stdout.write(`${id}> `);
};

export default class SwarmNet extends EventEmitter implements INodeNet {
    public id: string;
    public peerIds: string[] = [];
    public swarm: Topology;
    public streams: StreamSet;
    private defaultId: string = "default";

    constructor() {
        super();
        this.streams = new StreamSet();
        const fallback = () => {
            this.tryListen(generateUUID(), [this.defaultId], fallback);
        };
        this.tryListen(this.defaultId, [], fallback);
    }

    log(data: string): void {
        // process.stdout.clearLine(-1); // clear current text
        // process.stdout.cursorTo(0);
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
        this.emit("connection");
        // add comm socket to set
        this.streams.add(newPeer);
        // add string id of peer only if it's not already there and not my id
        const peerId = addressToId(peerAddress);
        if (!this.peerIds.find((id) => id === peerId))
            this.peerIds.push(peerId);
        // send peer table
        newPeer.on("data", (data) => {
            // only keep received table entries that are not in my table and
            // that don't reference myself
        });
        newPeer.on("close", () => {
            this.peerIds = this.peerIds.filter(
                (id) => IdToAddress(id) !== peerAddress
            );
        });
    }

    broadcast(
        message: Block | Block[] | InitialTransaction | SignedTransaction
    ): void {
        switch (message.constructor) {
            case Block:
                this.broadcastBlock(message as Block);
                break;
            case InitialTransaction:
                this.broadcastInitTx(message as InitialTransaction);
                break;
            case SignedTransaction:
                this.broadcastSignedTx(message as SignedTransaction);
                break;
            default:
                this.broadcastBlockchain(message as Block[]);
                break;
        }
    }

    broadcastBlock(block: Block) {}
    broadcastBlockchain(blockchain: Block[]) {}
    broadcastInitTx(tx: InitialTransaction) {}
    broadcastSignedTx(tx: SignedTransaction) {}
}
