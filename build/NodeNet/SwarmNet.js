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
var Block_1 = require("src/Block/Block");
var InitialTransaction_1 = require("src/Transactions/InitialTransaction");
var SignedTransaction_1 = require("src/Transactions/SignedTransaction");
var stream_set_1 = __importDefault(require("stream-set"));
var Sockets_1 = __importDefault(require("src/Network/Sockets"));
var register_multicast_dns_1 = __importDefault(require("register-multicast-dns"));
var hash_to_port_1 = __importDefault(require("hash-to-port"));
var uuid_1 = require("uuid");
function toAddress(name) {
    return name + ".local:" + hash_to_port_1.default(name);
}
var log = function (data) {
    process.stdout.clearLine(-1); // clear current text
    process.stdout.cursorTo(0);
    process.stdout.write(data);
    // process.stdout.write(`${id}> `);
};
var SwarmNet = /** @class */ (function (_super) {
    __extends(SwarmNet, _super);
    function SwarmNet() {
        var _this = _super.call(this) || this;
        _this.defaultId = "default";
        _this.streams = new stream_set_1.default();
        var fallback = function () {
            _this.tryListen(uuid_1.v4(), [_this.defaultId], fallback);
        };
        _this.tryListen(_this.defaultId, [], fallback);
        return _this;
    }
    SwarmNet.prototype.tryListen = function (id, peerIds, fallback) {
        this.id = id; // defaultId or generateUUID()
        register_multicast_dns_1.default(this.id);
        this.swarm = new Sockets_1.default(toAddress(this.id), peerIds.map(toAddress), fallback);
        this.setSwarmCallbacks();
    };
    SwarmNet.prototype.setSwarmCallbacks = function () {
        this.swarm.on("listening", this.onListen);
        this.swarm.on("connection", this.onConnection);
    };
    SwarmNet.prototype.onListen = function () {
        log("[listening on " + toAddress(this.id) + "]\n");
    };
    SwarmNet.prototype.onConnection = function (newPeer, peerAddress) {
        var _this = this;
        log("[" + peerAddress + " joined]\n");
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
                log("[received " + peerAddress + "'s peer table]\n");
                var table = obj.payload;
                // only keep received table entries that are not in my table and
                // that don't reference myself
                var unknownPeers = table.filter(function (peerId) {
                    return !_this.peerIds.includes(peerId) && peerId !== _this.id;
                });
                unknownPeers.forEach(function (peerId) {
                    _this.peerIds.push(peerId);
                    log("[adding " + toAddress(peerId) + " to swarm]\n");
                    _this.swarm.add(toAddress(peerId));
                });
            }
            else if (obj.type === "MESSAGE")
                log(obj.payload);
        });
        newPeer.on("close", function () {
            log("[" + peerAddress + " left]\n");
            _this.peerIds = _this.peerIds.filter(function (id) { return toAddress(id) !== peerAddress; });
        });
    };
    SwarmNet.prototype.broadcast = function (message) {
        switch (message.constructor) {
            case Block_1.Block:
                this.broadcastBlock(message);
                break;
            case InitialTransaction_1.InitialTransaction:
                this.broadcastInitTx(message);
                break;
            case SignedTransaction_1.SignedTransaction:
                this.broadcastSignedTx(message);
                break;
            default:
                this.broadcastBlockchain(message);
                break;
        }
    };
    SwarmNet.prototype.broadcastBlock = function (block) { };
    SwarmNet.prototype.broadcastBlockchain = function (blockchain) { };
    SwarmNet.prototype.broadcastInitTx = function (tx) { };
    SwarmNet.prototype.broadcastSignedTx = function (tx) { };
    return SwarmNet;
}(events_1.default));
exports.default = SwarmNet;
