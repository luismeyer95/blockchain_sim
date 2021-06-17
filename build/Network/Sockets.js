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
var net_1 = __importDefault(require("net"));
var events_1 = __importDefault(require("events"));
var network_address_1 = __importDefault(require("network-address"));
var length_prefixed_message_1 = __importDefault(require("length-prefixed-message"));
var Topology = /** @class */ (function (_super) {
    __extends(Topology, _super);
    function Topology(me, peers, errorCallback) {
        var _this = _super.call(this) || this;
        if (/^\d+$/.test(me))
            me = network_address_1.default() + ":" + me;
        _this.me = me || "";
        _this.peers = {};
        _this.server = null;
        _this.errorCallback = errorCallback;
        if (_this.me)
            _this.listen(Number(me.split(":")[1]));
        // events.EventEmitter.call(this);
        // if (peers) [].concat(peers).forEach(this.add.bind(this));
        peers.forEach(function (p) { return _this.add(p); });
        return _this;
    }
    Topology.prototype.listen = function (port) {
        var _this = this;
        this.server = net_1.default.createServer(function (socket) {
            _this.onconnection(socket);
        });
        if (this.errorCallback)
            this.server.on("error", this.errorCallback);
        this.server.listen(port);
    };
    Topology.prototype.add = function (addr) {
        if (addr === this.me)
            return;
        var host = addr.split(":")[0];
        var port = Number(addr.split(":")[1]);
        var peer = (this.peers[addr] = this.peers[addr] || { id: addr });
        peer.host = host;
        peer.port = port;
        peer.retries = 0;
        peer.reconnectTimeout = peer.reconnectTimeout || null;
        peer.pendingSocket = peer.pendingSocket || null;
        peer.socket = peer.socket || null;
        this.connect(peer);
    };
    Topology.prototype.connect = function (peer, socket) {
        var _this = this;
        // destroy socket and leave if a pending/normal peer.socket exists
        if (peer.socket || peer.pendingSocket)
            return socket && socket.destroy();
        // reset the reconnect timeout
        if (peer.reconnectTimeout)
            clearTimeout(peer.reconnectTimeout);
        // create the peer comm socket if parameter was not passed
        if (!socket)
            socket = net_1.default.connect(peer.port, peer.host);
        // send our address ('id.local:port')
        length_prefixed_message_1.default.write(socket, this.me);
        // set this socket as pending
        peer.pendingSocket = socket;
        // WTF ? is our address string "higher" than our peer's address?
        //   if (self.me > peer.id) return onconnection(self, socket);
        // set socket to destroy on error and on a 15s timeout
        // and on socket close, try to reconnect
        this.errorHandle(socket);
        this.attachCleanup(peer, socket);
        // maybe blocks and gets killed by error/timeout eventually?
        length_prefixed_message_1.default.read(socket, function () {
            _this.onready(peer, socket);
        });
    };
    Topology.prototype.onready = function (peer, socket) {
        socket.setTimeout(0); // reset timeout
        var oldSocket = peer.socket;
        peer.retries = 0;
        peer.socket = socket;
        peer.pendingSocket = null;
        if (oldSocket)
            oldSocket.destroy();
        this.emit("connection", peer.socket, peer.id);
    };
    Topology.prototype.onconnection = function (socket) {
        var _this = this;
        console.log("onconnection emitted");
        // set socket to destroy on error and on a 15s timeout
        this.errorHandle(socket);
        length_prefixed_message_1.default.read(socket, function (from) {
            from = from.toString();
            var peer = (_this.peers[from] = _this.peers[from] || { id: from });
            // console.log(from, ' > ', self.me,from>self.me ? 'CONNECT!' : 'NOT CONNECT REE')
            // if (from > self.me) return connect(self, peer, socket);
            length_prefixed_message_1.default.write(socket, _this.me);
            _this.attachCleanup(peer, socket);
            _this.onready(peer, socket);
        });
    };
    // on socket close, try to reconnect
    Topology.prototype.attachCleanup = function (peer, socket) {
        var _this = this;
        socket.on("close", function () {
            if (peer.socket === socket)
                peer.socket = null;
            if (peer.pendingSocket === socket)
                peer.pendingSocket = null;
            if (peer.socket)
                return;
            if (!peer.host)
                return delete _this.peers[peer.id];
            var reconnect = function () {
                _this.connect(peer);
            };
            peer.retries++;
            peer.reconnectTimeout = setTimeout(reconnect, (1 << peer.retries) * 250);
            // peer.reconnectTimeout = setTimeout(reconnect, 100);
            _this.emit("reconnect", peer.id, peer.retries);
        });
    };
    // set socket to destroy on error and on a 15s timeout
    Topology.prototype.errorHandle = function (socket) {
        socket.on("error", function () {
            socket.destroy();
        });
        socket.setTimeout(15000, function () {
            // 15s to do the handshake
            socket.destroy();
        });
    };
    Topology.prototype.destroy = function () {
        var _this = this;
        if (this.server)
            this.server.close();
        Object.keys(this.peers).forEach(function (addr) { return _this.remove(addr); });
    };
    Topology.prototype.remove = function (addr) {
        if (addr === this.me)
            return;
        var peer = this.peers[addr];
        if (!peer)
            return;
        delete this.peers[addr];
        peer.host = null; // will stop reconnects
        if (peer.socket)
            peer.socket.destroy();
        if (peer.pendingSocket)
            peer.pendingSocket.destroy();
        clearTimeout(peer.reconnectTimeout);
    };
    Topology.prototype.peer = function (addr) {
        return (this.peers[addr] && this.peers[addr].socket) || null;
    };
    return Topology;
}(events_1.default.EventEmitter));
exports.default = Topology;
