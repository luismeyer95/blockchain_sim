"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
var zod_1 = require("zod");
var Loggers_1 = require("src/Logger/Loggers");
var Node = /** @class */ (function () {
    function Node(factory, protocol, logger) {
        var _this = this;
        if (logger === void 0) { logger = Loggers_1.log; }
        this.log = Loggers_1.log;
        this.state = factory.createStateInstance();
        this.chainOperator = factory.createChainOperatorInstance();
        this.factory = factory;
        this.protocol = protocol;
        this.log = logger;
        var BlockValidator = this.factory.getBlockShapeValidator();
        this.protocol.onBroadcast("blocks", function (data, peer, relay) {
            var res = _this.processReceivedBlocks(data);
            if (res === null || res === void 0 ? void 0 : res.missing) {
                _this.protocol.requestBlocks(res.missing, peer, function (data) {
                    _this.processReceivedBlocks(data);
                });
            }
        });
        this.protocol.onBroadcast("tx", function (data, peer, relay) {
            try {
                var tx = JSON.parse(data);
                _this.processReceivedTransaction(tx, relay);
            }
            catch (err) {
                _this.log("[node]: received bad transaction shape (broadcast)\n");
            }
        });
        this.protocol.onBlocksRequest(function (range, peer, respond) {
            var chain = _this.state.getChainState();
            var blockRange = chain.slice(range[0], range[1]);
            var serializedRange = JSON.stringify(blockRange);
            respond(serializedRange);
        });
    }
    // TODO: maybe leave clue about validation success through logging
    Node.prototype.processReceivedBlocks = function (data) {
        var BlockArrayValidator = zod_1.z.array(this.factory.getBlockShapeValidator());
        var chain = this.state.getChainState();
        var obj = JSON.parse(data);
        var blockArrayValidation = BlockArrayValidator.safeParse(obj);
        if (blockArrayValidation.success) {
            var rangeValidation = this.chainOperator.validateBlockRange(chain, blockArrayValidation.data);
            if (rangeValidation.success &&
                rangeValidation.chain.length > chain.length)
                this.state.setChainState(rangeValidation.chain);
            else if (rangeValidation.success === false &&
                rangeValidation.missing)
                return { missing: rangeValidation.missing };
        }
        return null;
    };
    Node.prototype.processReceivedTransaction = function (tx, onSuccess) {
        if (onSuccess === void 0) { onSuccess = function () { }; }
        var TransactionValidator = this.factory.getTransactionShapeValidator();
        var txShapeValidation = TransactionValidator.safeParse(tx);
        if (!txShapeValidation.success)
            return;
        var txValidation = this.state.addTransaction(tx);
        if (txValidation.success && onSuccess)
            onSuccess();
        else if (!txValidation.success)
            this.log("[node]: bad transaction data, rejected\n");
    };
    Node.prototype.createWallet = function (keypair) {
        var _this = this;
        var wallet = this.factory.createWalletInstance(keypair, this.state);
        wallet.onTransaction(function (tx) {
            var successCallback = function () {
                var txSerial = JSON.stringify(tx);
                _this.protocol.broadcast("tx", txSerial);
            };
            _this.processReceivedTransaction(tx, successCallback);
        });
        return wallet;
    };
    Node.prototype.createMiner = function (keypair) {
        var _this = this;
        var miner = this.factory.createMinerInstance(keypair, this.state);
        var BlockValidator = this.factory.getBlockShapeValidator();
        miner.onMinedBlock(function (block) {
            var blockShapeValidation = BlockValidator.safeParse(block);
            if (!blockShapeValidation.success)
                return;
            var chain = _this.state.getChainState();
            var blockValidation = _this.chainOperator.validateBlockRange(chain, [blockShapeValidation.data]);
            if (blockValidation.success &&
                blockValidation.chain.length > chain.length) {
                console.log("~ BLOCK WAS MINED :) ~");
                _this.state.setChainState(blockValidation.chain);
            }
            else {
                console.log("~ BAD BLOCK, REJECTION MOMENT :( ~");
                process.exit(0);
            }
        });
        return miner;
    };
    return Node;
}());
exports.Node = Node;
//# sourceMappingURL=Node.js.map