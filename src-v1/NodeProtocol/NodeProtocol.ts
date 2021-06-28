import { Block } from "src/Block/Block";
import {
    SignedTransaction,
    InitialTransaction,
} from "src/Transactions/Transactions";
import INodeProtocol, {
    INodeProtocolObjects,
} from "src/NodeProtocol/INodeProtocol";
import { log } from "src/Logger/Loggers";
import ILogger from "src/Logger/ILogger";
import INodeNet from "src/NodeNet/INodeNet";
import { z } from "zod";
import { TwoWayMap } from "src/utils";

export default class NodeProtocol implements INodeProtocol {
    private log: ILogger;
    private net: INodeNet;

    private ctorMap: TwoWayMap<string, any>;

    constructor(logger: ILogger = log) {
        this.log = logger;

        this.ctorMap = new TwoWayMap<string, any>(
            ["initial_tx", InitialTransaction],
            ["block", Block],
            ["signed_tx", SignedTransaction]
        );
    }

    private validatesProtocolMsgType = (type: string, obj: unknown) => {
        const validator = z.object({
            type: z.literal(type),
            payload: z.string(),
        });

        return validator.safeParse(obj);
    };

    createMessage(
        resource: Block | InitialTransaction | SignedTransaction
    ): unknown {
        const serializedPayload = resource.serialize();
        const typestring = this.ctorMap.getKey(resource.constructor);
        return {
            type: typestring,
            payload: serializedPayload,
        };
    }

    interpretMessage(
        payload: unknown
    ): Block | InitialTransaction | SignedTransaction | null {
        const map = this.ctorMap.getMap();
        for (const [key, ctor] of map) {
            let validation = this.validatesProtocolMsgType(key, payload);
            if (validation.success) {
                return new ctor(validation.data.payload);
            }
        }
        return null;
    }
}
