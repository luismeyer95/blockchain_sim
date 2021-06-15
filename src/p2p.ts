import crypto from "crypto";
import Swarm from "discovery-swarm";
import defaults from "dat-swarm-defaults";
import getPort from "get-port";
import readline from "readline";
import { Socket } from "net";

/**
 * Here we will save our TCP peer connections
 * using the peer id as key: { peer_id: TCP_Connection }
 */
type Peers = {
    [peer: string]: {
        conn: Socket;
        seq: number;
    };
};
const peers: Peers = {};
// Counter for connections, used for identify connections
let connSeq: number = 0;

// Peer Identity, a random hash for identify your peer
const myId = crypto.randomBytes(32);
console.log("Your identity: " + myId.toString("hex"));

// reference to redline interface
let rl: readline.Interface | undefined;
/**
 * Function for safely call console.log with readline interface active
 */
function log(...args: any[]) {
    if (rl) {
        // rl.clearLine();
        rl.close();
        rl = undefined;
    }
    args.forEach(console.log);
    askUser();
}

/*
 * Function to get text input from user and send it to other peers
 * Like a chat :)
 */
const askUser = async () => {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question("Send message: ", (message) => {
        // Broadcast to peers
        for (let id in peers) {
            peers[id].conn.write(message);
        }
        rl?.close();
        rl = undefined;
        askUser();
    });
};

/**
 * Default DNS and DHT servers
 * This servers are used for peer discovery and establishing connection
 */
const config = defaults({
    // peer-id
    id: myId,
});

/**
 * discovery-swarm library establishes a TCP p2p connection and uses
 * discovery-channel library for peer discovery
 */
const sw = Swarm(config);

(async () => {
    // Choose a random unused port for listening TCP peer connections
    const port = await getPort();

    sw.listen(port);
    console.log("Listening to port: " + port);

    /**
     * The channel we are connecting to.
     * Peers should discover other peers in this channel
     */
    sw.join("meyercoin");

    sw.on("connection", (conn: Socket, info: any) => {
        // Connection id
        const seq = connSeq;

        const peerId = info.id.toString("hex");
        log(`Connected #${seq} to peer: ${peerId}`);

        // Keep alive TCP connection with peer
        if (info.initiator) {
            try {
                // conn.setKeepAlive(true, 6000000);
            } catch (exception) {
                log("exception", exception);
            }
        }

        conn.on("data", (data) => {
            // Here we handle incomming messages
            log(`${peerId}: ` + data.toString());
        });

        conn.on("close", () => {
            // Here we handle peer disconnection
            log(`Connection ${seq} closed, peer id: ${peerId}`);
            // If the closing connection is the last connection with the peer, removes the peer
            if (peers[peerId].seq === seq) {
                delete peers[peerId];
            }
        });

        // Save the connection
        // if (!peers[peerId]) {
        //     peers[peerId] = {};
        // }
        // peers[peerId].conn = conn;
        // peers[peerId].seq = seq;

        peers[peerId] = {
            conn,
            seq,
        };

        connSeq++;
    });

    // Read user message from command line
    askUser();
})();
