"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeNet = void 0;
var events_1 = __importDefault(require("events"));
var Topology_1 = __importDefault(require("src/Topology/Topology"));
var register_multicast_dns_1 = __importDefault(require("register-multicast-dns"));
var hash_to_port_1 = __importDefault(require("hash-to-port"));
var Loggers_1 = require("src/Logger/Loggers");
var uuid_1 = require("uuid");
var zod_1 = require("zod");
var duplex_json_stream_1 = __importDefault(require("duplex-json-stream"));
var Encryption_1 = require("src/Encryption/Encryption");
function IdToAddress(name) {
    return name + ".local:" + hash_to_port_1.default(name);
}
function addressToId(addr) {
    return addr.substr(0, addr.indexOf("."));
}
var PeerTableInfo = zod_1.z.object({
    peer: zod_1.z.object({
        table: zod_1.z.string().array(),
    }),
});
var Payload = zod_1.z.object({
    payload: zod_1.z.string(),
});
var PeerSet = /** @class */ (function (_super) {
    __extends(PeerSet, _super);
    function PeerSet() {
        var _this = _super.call(this) || this;
        _this.peers = [];
        _this.peers = [];
        return _this;
    }
    PeerSet.prototype.has = function (stream) {
        var found = this.peers.find(function (peer) { return peer.socket === stream; });
        return !!found;
    };
    PeerSet.prototype.get = function (handle) {
        if (typeof handle === "string")
            return this.peers.find(function (peer) { return peer.addr === handle; });
        return this.peers.find(function (peer) { return peer.socket === handle; });
    };
    PeerSet.prototype.forEach = function (fn) {
        this.peers.forEach(fn);
    };
    PeerSet.prototype.rm = function (stream) {
        var found = this.peers.find(function (peer) { return peer.socket === stream; });
        if (!found)
            return;
        var index = this.peers.indexOf(found);
        this.peers.splice(index, 1);
        this.emit("remove", found);
    };
    PeerSet.prototype.add = function (socket, addr) {
        var _this = this;
        if (this.has(socket))
            return socket;
        var peer = { socket: socket, addr: addr };
        this.peers.push(peer);
        socket.on("close", function () {
            _this.rm(socket);
        });
        this.emit("add", peer);
        return socket;
    };
    return PeerSet;
}(events_1.default));
var NodeNet = /** @class */ (function (_super) {
    __extends(NodeNet, _super);
    function NodeNet(logger) {
        if (logger === void 0) { logger = Loggers_1.log; }
        var _this = _super.call(this) || this;
        _this.peerTable = [];
        _this.msgCache = new Set();
        _this.defaultId = "default";
        _this.isUnknownPeer = function (peerAddress) {
            return !_this.peerTable.find(function (addr) { return addr === peerAddress && addr !== IdToAddress(_this.id); });
        };
        _this.log = logger;
        _this.peers = new PeerSet();
        var fallback = function () {
            _this.tryListen(uuid_1.v4(), [_this.defaultId], fallback);
        };
        _this.tryListen(_this.defaultId, [], fallback);
        return _this;
    }
    NodeNet.prototype.tryListen = function (id, peerIds, fallback) {
        this.id = id; // defaultId or generateUUID()
        register_multicast_dns_1.default(this.id);
        this.swarm = new Topology_1.default(IdToAddress(this.id), peerIds.map(IdToAddress), fallback);
        this.setSwarmCallbacks();
    };
    NodeNet.prototype.setSwarmCallbacks = function () {
        this.swarm.on("listening", this.onListen.bind(this));
        this.swarm.on("connection", this.onConnection.bind(this));
    };
    NodeNet.prototype.onListen = function () {
        this.log("[listening on " + IdToAddress(this.id) + "]\n");
    };
    NodeNet.prototype.onConnection = function (newPeer, peerAddress) {
        this.emit("connection");
        var shid = this.shortenAddr(peerAddress);
        this.log("[" + shid + " joined]\n");
        // add comm socket to set
        // this.streams.add(newPeer);
        var jsonPeer = duplex_json_stream_1.default(newPeer);
        this.peers.add(jsonPeer, peerAddress);
        if (this.isUnknownPeer(peerAddress))
            this.peerTable.push(peerAddress);
        this.sendPeerTable(jsonPeer);
        this.subscribeToPeerEvents(jsonPeer, peerAddress);
    };
    NodeNet.prototype.sendPeerTable = function (peer) {
        var peerTableMsg = {
            peer: {
                table: this.peerTable,
            },
        };
        peer.write(peerTableMsg);
    };
    NodeNet.prototype.subscribeToPeerEvents = function (jsonPeer, peerAddress) {
        var _this = this;
        var shid = this.shortenAddr(peerAddress);
        jsonPeer.on("data", function (obj) {
            _this.log("[received data from peer " + shid + "]\n");
            _this.processMessageNetworkInfo(obj, peerAddress);
            _this.processPayload(obj, peerAddress);
        });
        jsonPeer.on("close", function () {
            _this.log("[disconnect: " + shid + "]\n");
        });
    };
    NodeNet.prototype.processMessageNetworkInfo = function (obj, peerAddress) {
        var _this = this;
        var netValidation = PeerTableInfo.safeParse(obj);
        if (netValidation.success) {
            var shid = this.shortenAddr(peerAddress);
            this.log("[received " + shid + "'s peer table]\n");
            var table = netValidation.data.peer.table;
            // only keep received table entries that are not in my table and
            // that don't reference myself
            var unknownPeers = table.filter(this.isUnknownPeer);
            unknownPeers.forEach(function (addr) {
                _this.peerTable.push(addr);
                _this.swarm.add(addr);
                _this.log("[adding " + _this.shortenAddr(addr) + " to swarm]\n");
            });
        }
    };
    NodeNet.prototype.processPayload = function (obj, peerAddress) {
        var _this = this;
        var payloadValidation = Payload.safeParse(obj);
        if (payloadValidation.success) {
            var payload = payloadValidation.data.payload;
            var payloadHash_1 = Encryption_1.hash(Buffer.from(payload))
                .digest()
                .toString("base64");
            if (this.msgCache.has(payloadHash_1))
                return;
            this.msgCache.add(payloadHash_1);
            setTimeout(function () {
                _this.msgCache.delete(payloadHash_1);
            }, 60 * 1000);
            this.emit("payload", peerAddress, payload);
        }
    };
    NodeNet.prototype.broadcast = function (message) {
        var netMessage = {
            payload: message,
        };
        var payloadHash = Encryption_1.hash(Buffer.from(message))
            .digest()
            .toString("base64");
        this.msgCache.add(payloadHash);
        this.peers.forEach(function (_a) {
            var socket = _a.socket;
            socket.write(netMessage);
        });
    };
    NodeNet.prototype.send = function (peer, data) {
        var foundPeer = this.peers.get(peer);
        if (foundPeer) {
            var netMessage = {
                payload: data,
            };
            foundPeer.socket.write(netMessage);
        }
        else {
            throw new Error("NodeNet.send(): peer id not matching to any entry");
        }
    };
    NodeNet.prototype.receive = function (callback) {
        this.on("payload", callback);
    };
    NodeNet.prototype.shortenAddr = function (addr) {
        var id = addressToId(addr);
        return id.slice(0, this.defaultId.length);
    };
    return NodeNet;
}(events_1.default));
exports.NodeNet = NodeNet;
