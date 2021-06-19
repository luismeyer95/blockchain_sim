"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Block_1 = require("src/Block/Block");
var Transactions_1 = require("src/Transactions/Transactions");
var Loggers_1 = require("src/Logger/Loggers");
var zod_1 = require("zod");
var utils_1 = require("src/utils");
var NodeProtocol = /** @class */ (function () {
    function NodeProtocol(logger) {
        if (logger === void 0) { logger = Loggers_1.log; }
        this.validatesProtocolMsgType = function (type, obj) {
            var validator = zod_1.z.object({
                type: zod_1.z.literal(type),
                payload: zod_1.z.string(),
            });
            return validator.safeParse(obj);
        };
        this.log = logger;
        this.ctorMap = new utils_1.TwoWayMap(["initial_tx", Transactions_1.InitialTransaction], ["block", Block_1.Block], ["signed_tx", Transactions_1.SignedTransaction]);
    }
    NodeProtocol.prototype.createMessage = function (resource) {
        var serializedPayload = resource.serialize();
        var typestring = this.ctorMap.getKey(resource.constructor);
        return {
            type: typestring,
            payload: serializedPayload,
        };
    };
    NodeProtocol.prototype.interpretMessage = function (payload) {
        var map = this.ctorMap.getMap();
        for (var _i = 0, map_1 = map; _i < map_1.length; _i++) {
            var _a = map_1[_i], key = _a[0], ctor = _a[1];
            var validation = this.validatesProtocolMsgType(key, payload);
            if (validation.success) {
                return new ctor(validation.data.payload);
            }
        }
        return null;
    };
    return NodeProtocol;
}());
exports.default = NodeProtocol;
