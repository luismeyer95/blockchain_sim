"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainMiner = void 0;
var BlockchainOperator_1 = require("./BlockchainOperator");
var IBlock_1 = require("./IBlock");
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
    function BlockchainMiner(keypair, state, logger) {
        var _this = this;
        if (logger === void 0) { logger = Loggers_1.log; }
        this.worker = null;
        this.events = new events_1.default();
        this.operator = new BlockchainOperator_1.BlockchainOperator();
        // private filterValidTransactions(txs: AccountTransactionType[]) {
        //     return txs.filter((tx, index) => {
        //         const txPool = this.txCache.getArray().slice(0, index);
        //         const result = this.operator.validateTransaction(
        //             this.chain,
        //             tx,
        //             txPool
        //         );
        //         return result.success;
        //     });
        // }
        // private cleanupTxCache() {
        //     const txs = this.txCache.getArray();
        //     const validTxs = this.filterValidTransactions(txs);
        //     this.txCache.fromArray(validTxs);
        // }
        this.updateMinedTemplateState = function () {
            // this.cleanupTxCache();
            if (!_this.worker)
                return;
            var blockTemplate = _this.operator.createBlockTemplate(_this.keypair, _this.state.getTxPoolState(), _this.state.getChainState());
            // TODO: remove hardcoded complexity!!
            _this.updateTaskData(blockTemplate, 19);
        };
        this.log = logger;
        this.keypair = keypair;
        this.state = state;
        process.on("exit", function () {
            _this.killMinerProcess();
        });
    }
    BlockchainMiner.prototype.setMinerAccount = function (keypair) {
        this.keypair = keypair;
        if (this.worker) {
            this.stopMining();
            this.startMining();
        }
    };
    BlockchainMiner.prototype.startMining = function () {
        var _this = this;
        if (this.worker)
            throw new Error("worker is already mining");
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
        this.updateMinedTemplateState();
        this.state.on("change", this.updateMinedTemplateState);
    };
    BlockchainMiner.prototype.killMinerProcess = function () {
        if (this.worker) {
            this.worker.removeAllListeners();
            this.worker.kill("SIGINT");
        }
        this.worker = null;
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
        this.state.removeAllListeners();
    };
    BlockchainMiner.prototype.onMinedBlock = function (fn) {
        this.events.on("mined block", fn);
    };
    return BlockchainMiner;
}());
exports.BlockchainMiner = BlockchainMiner;
//# sourceMappingURL=BlockchainMiner.js.map