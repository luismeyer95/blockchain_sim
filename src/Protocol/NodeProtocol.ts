import INodeNet from "src/Interfaces/INodeNet";
import INodeProtocol from "src/Interfaces/INodeProtocol";
import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";
import { EventEmitter } from "stream";
import { z } from "zod";
import randstr from "randomstring";

const BlocksRequestValidator = z.object({
    id: z.string(),
    msg_type: z.literal("request"),
    data_type: z.literal("blocks"),
    data: z.object({
        range: z.number().array().length(2),
    }),
});

const BlocksResponseValidator = z.object({
    id: z.string(),
    msg_type: z.literal("response"),
    to_request: z.string(),
    data_type: z.literal("blocks"),
    payload: z.string(),
});

const BroadcastValidator = z.object({
    id: z.string(),
    msg_type: z.literal("broadcast"),
    data_type: z.string(),
    payload: z.string(),
});

type BlocksRequestType = z.infer<typeof BlocksRequestValidator>;
type BlocksResponseType = z.infer<typeof BlocksResponseValidator>;
type BroadcastType = z.infer<typeof BroadcastValidator>;

export class NodeProtocol implements INodeProtocol {
    private log: ILogger = log;
    private net: INodeNet;
    private events: EventEmitter;

    private validationMap: [z.ZodAny, (peer: string, obj: unknown) => any][] = [
        [BlocksRequestValidator, this.handleBlocksRequest.bind(this)],
        [BlocksResponseValidator, this.handleBlocksResponse.bind(this)],
        [BroadcastValidator, this.handleBroadcast.bind(this)],
    ];

    private dispatchByValidation(peer: string, data: string) {
        const obj = JSON.parse(data);
        for (const [validator, callback] of this.validationMap) {
            const result = validator.safeParse(obj);
            if (result.success) {
                callback(peer, result.data);
                return;
            }
        }
    }

    private respondCallbackThunk(requestId: string, peer: string) {
        return (responsePayload: string) => {
            const respMessage: BlocksResponseType = {
                id: randstr.generate(24),
                to_request: requestId,
                msg_type: "response",
                data_type: "blocks",
                payload: responsePayload,
            };
            this.net.send(peer, JSON.stringify(respMessage));
        };
    }

    private handleBlocksRequest(peer: string, obj: unknown) {
        const message = obj as BlocksRequestType;
        this.events.emit(
            "blocks request",
            message.data.range,
            peer,
            this.respondCallbackThunk(message.id, peer)
        );
    }

    private handleBlocksResponse(peer: string, obj: unknown) {
        const message = obj as BlocksResponseType;
        this.events.emit(
            `blocks response ${message.to_request}`,
            message.payload
        );
    }

    private handleBroadcast(peer: string, obj: unknown) {
        const message = obj as BroadcastType;
        this.events.emit(
            `${message.data_type} broadcast`,
            message.payload,
            peer
        );
    }

    constructor(logger: ILogger, net: INodeNet) {
        this.log = logger;
        this.net.receive((peer, data) => {
            this.dispatchByValidation(peer, data);
        });
    }

    requestBlocks(
        range: [number, number],
        peer: string,
        respHandler: (data: string) => void
    ): void {
        const message: BlocksRequestType = {
            id: randstr.generate(24),
            msg_type: "request",
            data_type: "blocks",
            data: {
                range,
            },
        };
        this.net.send(peer, JSON.stringify(message));
        this.events.once(`blocks response ${message.id}`, respHandler);
    }

    onBlocksRequest(
        callback: (
            range: [number, number],
            peer: string,
            respond: (data: string) => void
        ) => void
    ): void {
        this.events.on("blocks request", callback);
    }

    broadcast(type: string, data: string): any {
        const message: BroadcastType = {
            id: randstr.generate(24),
            msg_type: "broadcast",
            data_type: type,
            payload: data,
        };
        this.net.broadcast(JSON.stringify(message));
    }

    onBroadcast(
        type: string,
        callback: (data: string, peer: string) => void
    ): void {
        this.events.on(`${type} broadcast`, callback);
    }
}
