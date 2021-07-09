"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainMiner = void 0;
var BlockchainOperator_1 = require("./BlockchainOperator");
var IBlock_1 = require("./IBlock");
var CustomSet_1 = require("src/Utils/CustomSet");
var zod_1 = require("zod");
var child_process_1 = require("child_process");
var Loggers_1 = require("src/Logger/Loggers");
var events_1 = __importDefault(require("events"));
var deepEqual = require("deep-equal");
var PowProcessMessage = zod_1.z
    .object({
    block: IBlock_1.BlockValidator,
    complexity: zod_1.z.number(),
})
    .strict();
var BlockchainMiner = /** @class */ (function () {
    function BlockchainMiner(logger) {
        var _this = this;
        if (logger === void 0) { logger = Loggers_1.log; }
        this.txCache = new CustomSet_1.CustomSet(function (a, b) {
            return a.header.signature === b.header.signature;
        });
        this.chain = [];
        this.worker = null;
        this.events = new events_1.default();
        this.operator = new BlockchainOperator_1.BlockchainOperator();
        this.updateInterval = null;
        this.updateMinedTemplateState = function () {
            _this.cleanupTxCache();
            var blockTemplate = _this.operator.createBlockTemplate(_this.keypair, _this.txCache.getArray(), _this.chain);
            // TODO: remove hardcoded complexity!!
            _this.updateTaskData(blockTemplate, 23);
        };
        this.log = logger;
    }
    // adds a tx to the cached txs, to be included inside the block template
    BlockchainMiner.prototype.addTransaction = function (tx) {
        this.txCache.add(tx);
    };
    // updates the local chain state by only replacing/processing blocks
    // that changed (tx cache updates only consider changed blocks)
    // TODO: could benefit from optimizations if ever needed
    BlockchainMiner.prototype.setChainState = function (chain) {
        var _a;
        var _this = this;
        var firstChangingBlock = chain.find(function (block, index) {
            if (index >= _this.chain.length)
                return true;
            var localBlock = _this.chain[index];
            return localBlock.header.hash !== block.header.hash;
        });
        if (!firstChangingBlock)
            return;
        var changeIndex = firstChangingBlock.payload.index;
        var chainToAppend = chain.slice(changeIndex);
        chainToAppend.forEach(function (block) {
            _this.removeBlockTransactionsFromTxCache(block);
        });
        (_a = this.chain).splice.apply(_a, __spreadArray([changeIndex,
            this.chain.length - changeIndex], chainToAppend));
    };
    BlockchainMiner.prototype.removeBlockTransactionsFromTxCache = function (block) {
        var _this = this;
        block.payload.txs.forEach(function (tx) {
            _this.txCache.delete(tx);
        });
    };
    BlockchainMiner.prototype.filterValidTransactions = function (txs) {
        var _this = this;
        return txs.filter(function (tx) {
            var result = _this.operator.validateTransaction(_this.chain, tx);
            return result.success;
        });
    };
    BlockchainMiner.prototype.cleanupTxCache = function () {
        var txs = this.txCache.getArray();
        var validTxs = this.filterValidTransactions(txs);
        this.txCache.fromArray(validTxs);
    };
    BlockchainMiner.prototype.startMining = function (keypair) {
        var _this = this;
        if (this.worker)
            throw new Error("worker is already mining");
        this.keypair = keypair;
        this.worker = child_process_1.fork("./src/BlockchainDataFactory/pow_process.ts", [], {
            execArgv: ["-r", "ts-node/register"],
        });
        this.worker.on("message", function (msg) {
            var messageValidation = PowProcessMessage.safeParse(msg);
            if (messageValidation.success) {
                _this.events.emit("mined block", messageValidation.data.block);
            }
            else {
                console.log("[pow parent]: bad worker response");
            }
        });
        // process.on("SIGINT", () => {
        //     this.killMinerProcess();
        //     process.exit(0);
        // });
        this.updateInterval = setInterval(this.updateMinedTemplateState, 1000);
    };
    BlockchainMiner.prototype.killMinerProcess = function () {
        var _a;
        (_a = this.worker) === null || _a === void 0 ? void 0 : _a.kill("SIGINT");
    };
    BlockchainMiner.prototype.updateTaskData = function (block, complexity) {
        if (!this.worker)
            return;
        this.worker.send({
            block: block,
            complexity: complexity,
        });
    };
    BlockchainMiner.prototype.stopMining = function () {
        this.killMinerProcess();
        if (this.updateInterval)
            clearInterval(this.updateInterval);
        this.updateInterval = null;
    };
    BlockchainMiner.prototype.onMinedBlock = function (fn) {
        this.events.on("mined block", fn);
    };
    return BlockchainMiner;
}());
exports.BlockchainMiner = BlockchainMiner;
