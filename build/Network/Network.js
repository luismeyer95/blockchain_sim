"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var stream_set_1 = __importDefault(require("stream-set"));
var Sockets_1 = __importDefault(require("./Sockets"));
var register_multicast_dns_1 = __importDefault(require("register-multicast-dns"));
var hash_to_port_1 = __importDefault(require("hash-to-port"));
function toAddress(name) {
    return name + ".local:" + hash_to_port_1.default(name);
}
var id = process.argv[2];
var peerIds = process.argv.slice(3);
register_multicast_dns_1.default(id);
var swarm = new Sockets_1.default(toAddress(id), peerIds.map(toAddress));
var streams = new stream_set_1.default();
process.stdout.write(id + "> ");
var log = function (data) {
    process.stdout.clearLine(-1); // clear current text
    process.stdout.cursorTo(0);
    process.stdout.write(data);
    process.stdout.write(id + "> ");
};
swarm.on("connection", function (newPeer, peerAddress) {
    log("[" + peerAddress + " joined]\n");
    // add comm socket to set
    streams.add(newPeer);
    // add string id of peer only if it's not already there and not my id
    var peerId = peerAddress.substr(0, peerAddress.indexOf("."));
    if (!peerIds.find(function (id) { return id === peerId; }))
        peerIds.push(peerId);
    // send peer table
    newPeer.write(JSON.stringify({ type: "PEER_TABLE", payload: peerIds }));
    newPeer.on("data", function (data) {
        var obj = JSON.parse(data.toString());
        if (obj.type === "PEER_TABLE") {
            log("[received " + peerAddress + "'s peer table]\n");
            var table = obj.payload;
            // only keep received table entries that are not in my table and
            // that don't reference myself
            var unknownPeers = table.filter(function (peerId) { return !peerIds.includes(peerId) && peerId !== id; });
            unknownPeers.forEach(function (peerId) {
                peerIds.push(peerId);
                log("[adding " + toAddress(peerId) + " to swarm]\n");
                swarm.add(toAddress(peerId));
            });
        }
        else if (obj.type === "MESSAGE")
            log(obj.payload);
    });
    newPeer.on("close", function () {
        log("[" + peerAddress + " left]\n");
        peerIds = peerIds.filter(function (id) { return toAddress(id) !== peerAddress; });
    });
});
process.stdin.on("data", function (data) {
    var message = JSON.stringify({
        type: "MESSAGE",
        payload: id + "> " + data.toString(),
    });
    streams.forEach(function (stream) {
        stream.write(message);
    });
    process.stdout.write(id + "> ");
});
