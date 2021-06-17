import net from "net";
import events from "events";
import util from "util";
import networkAddress from "network-address";
import lpmessage from "length-prefixed-message";

type HostPortString = string;

type Nullable<T> = T | null | undefined;

type PeerInfo = {
    id: HostPortString;
    host?: Nullable<string>;
    port: number;
    retries: number;
    reconnectTimeout?: Nullable<ReturnType<typeof setTimeout>>;
    pendingSocket?: Nullable<net.Socket>;
    socket?: Nullable<net.Socket>;
};

class Topology extends events.EventEmitter {
    public me: HostPortString;
    public peers: { [key: string]: PeerInfo }; // HostPortString => PeerInfo
    public server?: Nullable<net.Server>;

    public errorCallback?: (err: Error) => void;

    constructor(
        me: HostPortString,
        peers: HostPortString[],
        errorCallback?: (err: Error) => void
    ) {
        super();

        if (/^\d+$/.test(me)) me = networkAddress() + ":" + me;

        this.me = me || "";
        this.peers = {};
        this.server = null;
        this.errorCallback = errorCallback;

        if (this.me) this.listen(Number(me.split(":")[1]));

        // events.EventEmitter.call(this);
        // if (peers) [].concat(peers).forEach(this.add.bind(this));
        peers.forEach((p) => this.add(p));
    }

    listen(port: number) {
        this.server = net.createServer((socket: net.Socket) => {
            this.onconnection(socket);
        });
        if (this.errorCallback) this.server.on("error", this.errorCallback);

        this.server.listen(port);
    }

    add(addr: HostPortString) {
        if (addr === this.me) return;

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
    }

    connect(peer: PeerInfo, socket?: net.Socket) {
        // destroy socket and leave if a pending/normal peer.socket exists
        if (peer.socket || peer.pendingSocket)
            return socket && socket.destroy();
        // reset the reconnect timeout
        if (peer.reconnectTimeout) clearTimeout(peer.reconnectTimeout);

        // create the peer comm socket if parameter was not passed
        if (!socket) socket = net.connect(peer.port, peer.host!);
        // send our address ('id.local:port')
        lpmessage.write(socket, this.me);
        // set this socket as pending
        peer.pendingSocket = socket;

        // WTF ? is our address string "higher" than our peer's address?
        //   if (self.me > peer.id) return onconnection(self, socket);

        // set socket to destroy on error and on a 15s timeout
        // and on socket close, try to reconnect
        this.errorHandle(socket);
        this.attachCleanup(peer, socket);

        // maybe blocks and gets killed by error/timeout eventually?
        lpmessage.read(socket, () => {
            this.onready(peer, socket!);
        });
    }

    onready(peer: PeerInfo, socket: net.Socket) {
        socket.setTimeout(0); // reset timeout
        var oldSocket = peer.socket;
        peer.retries = 0;
        peer.socket = socket;
        peer.pendingSocket = null;
        if (oldSocket) oldSocket.destroy();
        this.emit("connection", peer.socket, peer.id);
    }

    onconnection(socket: net.Socket) {
        // console.log("onconnection emitted");
        // set socket to destroy on error and on a 15s timeout
        this.errorHandle(socket);
        lpmessage.read(socket, (from: any) => {
            from = from.toString();

            var peer = (this.peers[from] = this.peers[from] || { id: from });

            // console.log(from, ' > ', self.me,from>self.me ? 'CONNECT!' : 'NOT CONNECT REE')
            // if (from > self.me) return connect(self, peer, socket);

            lpmessage.write(socket, this.me);
            this.attachCleanup(peer, socket);
            this.onready(peer, socket);
        });
    }

    // on socket close, try to reconnect
    attachCleanup(peer: PeerInfo, socket: net.Socket) {
        socket.on("close", () => {
            if (peer.socket === socket) peer.socket = null;
            if (peer.pendingSocket === socket) peer.pendingSocket = null;
            if (peer.socket) return;

            if (!peer.host) return delete this.peers[peer.id];

            var reconnect = () => {
                this.connect(peer);
            };

            peer.retries++;
            peer.reconnectTimeout = setTimeout(
                reconnect,
                (1 << peer.retries) * 250
            );
            // peer.reconnectTimeout = setTimeout(reconnect, 100);
            this.emit("reconnect", peer.id, peer.retries);
        });
    }

    // set socket to destroy on error and on a 15s timeout
    errorHandle(socket: net.Socket) {
        socket.on("error", function () {
            socket.destroy();
        });

        socket.setTimeout(15000, function () {
            // 15s to do the handshake
            socket.destroy();
        });
    }

    destroy() {
        if (this.server) this.server.close();
        Object.keys(this.peers).forEach((addr) => this.remove(addr));
    }

    remove(addr: HostPortString) {
        if (addr === this.me) return;

        var peer = this.peers[addr];
        if (!peer) return;

        delete this.peers[addr];
        peer.host = null; // will stop reconnects
        if (peer.socket) peer.socket.destroy();
        if (peer.pendingSocket) peer.pendingSocket.destroy();
        clearTimeout(peer.reconnectTimeout!);
    }

    peer(addr: HostPortString): net.Socket | null {
        return (this.peers[addr] && this.peers[addr].socket) || null;
    }
}

export default Topology;
