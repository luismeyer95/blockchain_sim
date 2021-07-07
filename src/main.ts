import { NodeNet } from "src/Net/NodeNet";
import { NodeProtocol } from "src/Protocol/NodeProtocol";
import INodeProtocol from "src/Interfaces/INodeProtocol";
import { log } from "./Logger/Loggers";
import { stdin } from "process";

const ptcl: INodeProtocol = new NodeProtocol(log, new NodeNet(log));

ptcl.onBroadcast("cock", (data, peer, relay) => {
    if (data.trim() === "pussy") {
        console.log("relayed!");
        relay();
    }
});

stdin.on("data", (buf: Buffer) => {
    ptcl.broadcast("cock", buf.toString());
});
