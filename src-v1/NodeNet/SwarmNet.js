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
var events_1 = __importDefault(require("events"));
var stream_set_1 = __importDefault(require("stream-set"));
var Sockets_1 = __importDefault(require("src/Network/Sockets"));
var register_multicast_dns_1 = __importDefault(require("register-multicast-dns"));
var hash_to_port_1 = __importDefault(require("hash-to-port"));
var Loggers_1 = require("src/Logger/Loggers");
var uuid_1 = require("uuid");
var zod_1 = require("zod");
function IdToAddress(name) {
    return name + ".local:" + hash_to_port_1.default(name);
}
function addressToId(addr) {
    return addr.substr(0, addr.indexOf("."));
}
var NetworkMessage = zod_1.z.object({
    peer: zod_1.z.object({
        type: zod_1.z.string(),
        table: zod_1.z.string().array(),
    }),
});
var Payload = zod_1.z.object({
    payload: zod_1.z.any().refine(function (p) { return p !== undefined; }),
});
var SwarmNet = /** @class */ (function (_super) {
    __extends(SwarmNet, _super);
    function SwarmNet(logger) {
        if (logger === void 0) { logger = Loggers_1.log; }
        var _this = _super.call(this) || this;
        _this.peerIds = [];
        _this.defaultId = "default";
        _this.log = logger;
        _this.streams = new stream_set_1.default();
        var fallback = function () {
            _this.tryListen(uuid_1.v4(), [_this.defaultId], fallback);
        };
        _this.tryListen(_this.defaultId, [], fallback);
        return _this;
    }
    SwarmNet.prototype.shortenId = function (id) {
        return id.slice(0, this.defaultId.length);
    };
    SwarmNet.prototype.tryListen = function (id, peerIds, fallback) {
        this.id = id; // defaultId or generateUUID()
        register_multicast_dns_1.default(this.id);
        this.swarm = new Sockets_1.default(IdToAddress(this.id), peerIds.map(IdToAddress), fallback);
        this.setSwarmCallbacks();
    };
    SwarmNet.prototype.setSwarmCallbacks = function () {
        this.swarm.on("listening", this.onListen.bind(this));
        this.swarm.on("connection", this.onConnection.bind(this));
    };
    SwarmNet.prototype.onListen = function () {
        this.log("[listening on " + IdToAddress(this.id) + "]\n");
    };
    SwarmNet.prototype.sendPeerTable = function (peer) {
        var peerTableMsg = {
            peer: {
                type: "peer_table",
                table: this.peerIds,
            },
        };
        this.send(peerTableMsg, peer);
    };
    SwarmNet.prototype.processNetworkMessage = function (obj, peer, peerAddress) {
        var _this = this;
        var netValidation = NetworkMessage.safeParse(obj);
        if (netValidation.success) {
            if (netValidation.data.peer.type === "peer_table") {
                var shid = this.shortenId(addressToId(peerAddress));
                this.log("[received " + shid + "'s peer table]\n");
                var table = netValidation.data.peer.table;
                // only keep received table entries that are not in my table and
                // that don't reference myself
                var unknownPeers = table.filter(function (peerId) {
                    return !_this.peerIds.includes(peerId) && peerId !== _this.id;
                });
                unknownPeers.forEach(function (peerId) {
                    _this.peerIds.push(peerId);
                    _this.log("[adding " + _this.shortenId(peerId) + " to swarm]\n");
                    _this.swarm.add(IdToAddress(peerId));
                });
            }
        }
    };
    SwarmNet.prototype.processPayload = function (obj) {
        var payloadValidation = Payload.safeParse(obj);
        if (payloadValidation.success) {
            this.emit("payload", payloadValidation.data.payload);
        }
    };
    SwarmNet.prototype.updatePeerTable = function (peerAddress) {
        // add string id of peer only if it's not already there and not my id
        var peerId = addressToId(peerAddress);
        if (!this.peerIds.find(function (id) { return id === peerId; }))
            this.peerIds.push(peerId);
    };
    SwarmNet.prototype.onConnection = function (newPeer, peerAddress) {
        var _this = this;
        this.emit("connection");
        var shid = this.shortenId(addressToId(peerAddress));
        this.log("[" + shid + " joined]\n");
        // add comm socket to set
        this.streams.add(newPeer);
        this.updatePeerTable(peerAddress);
        this.sendPeerTable(newPeer);
        newPeer.on("data", function (data) {
            _this.log("[received data from peer " + shid + "]\n");
            var strdata = data.toString();
            var obj = JSON.parse(strdata);
            _this.processNetworkMessage(obj, newPeer, peerAddress);
            _this.processPayload(obj);
        });
        newPeer.on("close", function () {
            _this.peerIds = _this.peerIds.filter(function (id) { return IdToAddress(id) !== peerAddress; });
        });
    };
    SwarmNet.prototype.broadcast = function (payload) {
        var _this = this;
        var message = { payload: payload };
        this.streams.forEach(function (stream) {
            _this.send(message, stream);
        });
    };
    SwarmNet.prototype.send = function (message, peer) {
        peer.write(JSON.stringify(message));
    };
    return SwarmNet;
}(events_1.default));
exports.default = SwarmNet;
