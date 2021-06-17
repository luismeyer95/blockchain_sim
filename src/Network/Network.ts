import net, { Socket } from "net";
import StreamSet from "stream-set";
import Topology from "./Sockets";
import register from "register-multicast-dns";
import toPort from "hash-to-port";

// net.connect(9000, "localhost", () => {});

function toAddress(name: string) {
    return name + ".local:" + toPort(name);
}

const id: string = process.argv[2];
let peerIds: string[] = process.argv.slice(3);

register(id);

const swarm = new Topology(toAddress(id), peerIds.map(toAddress));
const streams = new StreamSet();

process.stdout.write(`${id}> `);

const log = (data: string): void => {
    process.stdout.clearLine(-1); // clear current text
    process.stdout.cursorTo(0);
    process.stdout.write(data);
    process.stdout.write(`${id}> `);
};

swarm.on("connection", (newPeer: Socket, peerAddress: string) => {
    log(`[${peerAddress} joined]\n`);
    // add comm socket to set
    streams.add(newPeer);
    // add string id of peer only if it's not already there and not my id
    const peerId = peerAddress.substr(0, peerAddress.indexOf("."));
    if (!peerIds.find((id) => id === peerId)) peerIds.push(peerId);
    // send peer table
    newPeer.write(JSON.stringify({ type: "PEER_TABLE", payload: peerIds }));
    newPeer.on("data", (data) => {
        const obj = JSON.parse(data.toString());
        if (obj.type === "PEER_TABLE") {
            log(`[received ${peerAddress}'s peer table]\n`);
            const table = obj.payload;
            // only keep received table entries that are not in my table and
            // that don't reference myself
            const unknownPeers = table.filter(
                (peerId: string) => !peerIds.includes(peerId) && peerId !== id
            );
            unknownPeers.forEach((peerId: string) => {
                peerIds.push(peerId);
                log(`[adding ${toAddress(peerId)} to swarm]\n`);
                swarm.add(toAddress(peerId));
            });
        } else if (obj.type === "MESSAGE") log(obj.payload);
    });
    newPeer.on("close", () => {
        log(`[${peerAddress} left]\n`);
        peerIds = peerIds.filter((id) => toAddress(id) !== peerAddress);
    });
});

process.stdin.on("data", (data: Buffer) => {
    const message = JSON.stringify({
        type: "MESSAGE",
        payload: `${id}> ${data.toString()}`,
    });
    streams.forEach((stream) => {
        stream.write(message);
    });
    process.stdout.write(`${id}> `);
});
