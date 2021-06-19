"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var stream_set_1 = __importDefault(require("stream-set"));
var Sockets_1 = __importDefault(require("src/Network/Sockets"));
var register_multicast_dns_1 = __importDefault(require("register-multicast-dns"));
var hash_to_port_1 = __importDefault(require("hash-to-port"));
var uuid_1 = require("uuid");
function toAddress(name) {
    return name + ".local:" + hash_to_port_1.default(name);
}
var ChatP2P = /** @class */ (function () {
    function ChatP2P() {
        var _this = this;
        this.peerIds = [];
        this.defaultId = "default";
        this.streams = new stream_set_1.default();
        var fallback = function () {
            _this.tryListen(uuid_1.v4(), [_this.defaultId], fallback);
        };
        this.tryListen(this.defaultId, [], fallback);
    }
    ChatP2P.prototype.log = function (data) {
        process.stdout.clearLine(-1); // clear current text
        process.stdout.cursorTo(0);
        process.stdout.write(data);
        process.stdout.write(this.shortenId(this.id) + "> ");
    };
    ChatP2P.prototype.shortenId = function (id) {
        return id.slice(0, this.defaultId.length);
    };
    ChatP2P.prototype.getDataHook = function () {
        var _this = this;
        return function (data) {
            var message = JSON.stringify({
                type: "MESSAGE",
                payload: _this.shortenId(_this.id) + "> " + data.toString(),
            });
            _this.streams.forEach(function (stream) {
                stream.write(message);
            });
            process.stdout.write(_this.shortenId(_this.id) + "> ");
        };
    };
    ChatP2P.prototype.tryListen = function (id, peerIds, fallback) {
        this.id = id; // defaultId or generateUUID()
        register_multicast_dns_1.default(this.id);
        this.swarm = new Sockets_1.default(toAddress(this.id), peerIds.map(toAddress), fallback);
        this.setSwarmCallbacks();
    };
    ChatP2P.prototype.setSwarmCallbacks = function () {
        this.swarm.on("listening", this.onListen.bind(this));
        this.swarm.on("connection", this.onConnection.bind(this));
    };
    ChatP2P.prototype.onListen = function () {
        this.log("[listening on " + toAddress(this.id) + "]\n");
    };
    ChatP2P.prototype.onConnection = function (newPeer, peerAddress) {
        var _this = this;
        this.log("[" + peerAddress + " joined]\n");
        // add comm socket to set
        this.streams.add(newPeer);
        // add string id of peer only if it's not already there and not my id
        var peerId = peerAddress.substr(0, peerAddress.indexOf("."));
        if (!this.peerIds.find(function (id) { return id === peerId; }))
            this.peerIds.push(peerId);
        // send peer table
        newPeer.write(JSON.stringify({ type: "PEER_TABLE", payload: this.peerIds }));
        newPeer.on("data", function (data) {
            var obj = JSON.parse(data.toString());
            if (obj.type === "PEER_TABLE") {
                _this.log("[received " + peerAddress + "'s peer table]\n");
                var table = obj.payload;
                // only keep received table entries that are not in my table and
                // that don't reference myself
                var unknownPeers = table.filter(function (peerId) {
                    return !_this.peerIds.includes(peerId) && peerId !== _this.id;
                });
                unknownPeers.forEach(function (peerId) {
                    _this.peerIds.push(peerId);
                    _this.log("[adding " + toAddress(peerId) + " to swarm]\n");
                    _this.swarm.add(toAddress(peerId));
                });
            }
            else if (obj.type === "MESSAGE")
                _this.log(obj.payload);
        });
        newPeer.on("close", function () {
            _this.log("[" + peerAddress + " left]\n");
            _this.peerIds = _this.peerIds.filter(function (id) { return toAddress(id) !== peerAddress; });
        });
    };
    return ChatP2P;
}());
exports.default = ChatP2P;
