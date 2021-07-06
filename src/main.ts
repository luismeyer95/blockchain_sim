import net from "net";
import { NodeNet } from "src/Net/NodeNet";
import INodeNet from "src/Interfaces/INodeNet";
import ndjson from "ndjson";

const nodenet = new NodeNet((data) => {
    process.stdout.write(data);
});
nodenet.receive((peer, data) => {
    nodenet.send(peer, "OK!");
});

setTimeout(() => {
    nodenet.broadcast(`hello from ${nodenet.id} !`);
}, 1000);

////

const netnode = new NodeNet(console.log);
netnode.receive((peer, data) => {
    netnode.send(peer, "AIGHT!");
});

setTimeout(() => {
    netnode.broadcast(`hola from ${netnode.id} !`);
}, 1000);
