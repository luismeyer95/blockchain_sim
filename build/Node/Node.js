"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
var zod_1 = require("zod");
var Loggers_1 = require("src/Logger/Loggers");
var Node = /** @class */ (function () {
    function Node(factory, protocol, logger) {
        var _this = this;
        this.log = Loggers_1.log;
        this.factory = factory;
        this.protocol = protocol;
        this.log = logger;
        this.chainOperator = this.factory.createChainOperatorInstance();
        this.protocol.onBroadcast("blocks", function (data, peer, relay) {
            var res = _this.processReceivedBlocks(data);
            if (res === null || res === void 0 ? void 0 : res.missing) {
                _this.protocol.requestBlocks(res.missing, peer, function (data) {
                    _this.processReceivedBlocks(data);
                });
            }
        });
        this.protocol.onBroadcast("tx", function (data, peer, relay) { });
        this.protocol.onBlocksRequest(function (range, peer, respond) {
            var blockRange = _this.chain.slice(range[0], range[1]);
            var serializedRange = JSON.stringify(blockRange);
            respond(serializedRange);
        });
    }
    // TODO: maybe leave clue about validation success through logging
    Node.prototype.processReceivedBlocks = function (data) {
        var BlockArrayValidator = zod_1.z.array(this.factory.getBlockShapeValidator());
        var obj = JSON.parse(data);
        var blockArrayValidation = BlockArrayValidator.safeParse(obj);
        if (blockArrayValidation.success) {
            var rangeValidation = this.chainOperator.validateBlockRange(this.chain, blockArrayValidation.data);
            if (rangeValidation.success &&
                rangeValidation.chain.length > this.chain.length)
                this.chain = rangeValidation.chain;
            else if (rangeValidation.success === false &&
                rangeValidation.missing)
                return { missing: rangeValidation.missing };
        }
        return null;
    };
    return Node;
}());
exports.Node = Node;
