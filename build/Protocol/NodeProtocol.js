"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeProtocol = void 0;
var Loggers_1 = require("src/Logger/Loggers");
var stream_1 = require("stream");
var zod_1 = require("zod");
var randomstring_1 = __importDefault(require("randomstring"));
var BlocksRequestValidator = zod_1.z.object({
    id: zod_1.z.string(),
    msg_type: zod_1.z.literal("request"),
    data_type: zod_1.z.literal("blocks"),
    data: zod_1.z.object({
        range: zod_1.z.number().array().length(2),
    }),
});
var BlocksResponseValidator = zod_1.z.object({
    id: zod_1.z.string(),
    msg_type: zod_1.z.literal("response"),
    to_request: zod_1.z.string(),
    data_type: zod_1.z.literal("blocks"),
    payload: zod_1.z.string(),
});
var BroadcastValidator = zod_1.z.object({
    id: zod_1.z.string(),
    msg_type: zod_1.z.literal("broadcast"),
    data_type: zod_1.z.string(),
    payload: zod_1.z.string(),
});
var NodeProtocol = /** @class */ (function () {
    function NodeProtocol(net, logger) {
        var _this = this;
        if (logger === void 0) { logger = Loggers_1.log; }
        this.validationMap = [
            [BlocksRequestValidator, this.handleBlocksRequest.bind(this)],
            [BlocksResponseValidator, this.handleBlocksResponse.bind(this)],
            [BroadcastValidator, this.handleBroadcast.bind(this)],
        ];
        this.log = logger;
        this.net = net;
        this.events = new stream_1.EventEmitter();
        this.net.receive(function (peer, data) {
            _this.dispatchByValidation(peer, data);
        });
    }
    NodeProtocol.prototype.dispatchByValidation = function (peer, data) {
        var obj = JSON.parse(data);
        for (var _i = 0, _a = this.validationMap; _i < _a.length; _i++) {
            var _b = _a[_i], validator = _b[0], callback = _b[1];
            var result = validator.safeParse(obj);
            if (result.success) {
                callback(peer, result.data);
                return;
            }
        }
    };
    NodeProtocol.prototype.respondCallbackThunk = function (requestId, peer) {
        var _this = this;
        return function (responsePayload) {
            var respMessage = {
                id: randomstring_1.default.generate(24),
                to_request: requestId,
                msg_type: "response",
                data_type: "blocks",
                payload: responsePayload,
            };
            _this.net.send(peer, JSON.stringify(respMessage));
        };
    };
    NodeProtocol.prototype.handleBlocksRequest = function (peer, obj) {
        var message = obj;
        this.events.emit("blocks request", message.data.range, peer, this.respondCallbackThunk(message.id, peer));
    };
    NodeProtocol.prototype.handleBlocksResponse = function (peer, obj) {
        var message = obj;
        this.events.emit("blocks response " + message.to_request, message.payload);
    };
    NodeProtocol.prototype.handleBroadcast = function (peer, obj) {
        var _this = this;
        var message = obj;
        var relayHook = function () {
            _this.net.broadcast(JSON.stringify(message));
        };
        this.events.emit(message.data_type + " broadcast", message.payload, peer, relayHook);
    };
    NodeProtocol.prototype.requestBlocks = function (range, peer, respHandler) {
        var message = {
            id: randomstring_1.default.generate(24),
            msg_type: "request",
            data_type: "blocks",
            data: {
                range: range,
            },
        };
        this.net.send(peer, JSON.stringify(message));
        this.events.once("blocks response " + message.id, respHandler);
    };
    NodeProtocol.prototype.onBlocksRequest = function (callback) {
        this.events.on("blocks request", callback);
    };
    NodeProtocol.prototype.broadcast = function (type, data) {
        var message = {
            id: randomstring_1.default.generate(24),
            msg_type: "broadcast",
            data_type: type,
            payload: data,
        };
        this.net.broadcast(JSON.stringify(message));
    };
    NodeProtocol.prototype.onBroadcast = function (type, callback) {
        this.events.on(type + " broadcast", callback);
    };
    return NodeProtocol;
}());
exports.NodeProtocol = NodeProtocol;
//# sourceMappingURL=NodeProtocol.js.map