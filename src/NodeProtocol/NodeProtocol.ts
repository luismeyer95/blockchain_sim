import { Block } from "src/Block/Block";
import {
    SignedTransaction,
    InitialTransaction,
} from "src/Transactions/Transactions";
import INodeProtocol, {
    INodeProtocolObjects,
} from "src/NodeProtocol/INodeProtocol";
import EventEmitter from "events";
import { log } from "src/Logger/Loggers";
import ILogger from "src/Logger/ILogger";
import INodeNet from "src/NodeNet/INodeNet";
import SwarmNet from "src/NodeNet/SwarmNet";
import { z } from "zod";

// type MessageTypes = string;

// export interface Message<T> {
//     type: MessageTypes;
//     data: T extends "INIT_TX"
//         ? InitialTransaction
//         : T extends "SIGNED_TX"
//         ? SignedTransaction
//         : T extends "BLOCK"
//         ? Block
//         : any;
// }

const validatesProtocolMsgType = (type: string, obj: unknown) => {
    const validator = z.object({
        type: z.literal(type),
        payload: z.string(),
    });

    return validator.safeParse(obj);
    // return result.success ? result : null;
};

export default class NodeProtocol
    extends EventEmitter
    implements INodeProtocol
{
    private log: ILogger;
    private net: INodeNet;

    private ctorMap: { [key: string]: any } = {
        initial_tx: InitialTransaction,
        block: Block,
        signed_tx: SignedTransaction,
    };

    constructor(logger: ILogger = log, net: INodeNet = new SwarmNet()) {
        super();
        this.log = logger;
        this.net = net;
        this.net.on("payload", (payload: unknown) => {
            for (let [key, ctor] of Object.entries(this.ctorMap)) {
                let validation = validatesProtocolMsgType(key, payload);
                if (validation.success) {
                    this.emit(key, new ctor(validation.data.payload));
                    break;
                }
            }
        });
    }

    process(message: Block | InitialTransaction | SignedTransaction): void {
        const serializedPayload = message.serialize();
        switch (message.constructor) {
            case Block:
                this.send("block", serializedPayload);
                break;
            case InitialTransaction:
                this.send("initial_tx", serializedPayload);
                break;
            case SignedTransaction:
                this.send("signed_tx", serializedPayload);
                break;
            default:
                // this.processBlockchain(message as Block[]);
                break;
        }
    }

    send(type: string, payload: string) {
        this.log(`[broadcasting ${type}]\n`);

        const protocolMessage = {
            type,
            payload,
        };
        this.net.broadcast(protocolMessage);
    }
}
