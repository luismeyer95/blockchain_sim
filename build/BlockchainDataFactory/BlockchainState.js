"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainState = void 0;
var BlockchainOperator_1 = require("./BlockchainOperator");
var events_1 = __importDefault(require("events"));
var BlockchainStorage_1 = require("src/BlockchainDataFactory/BlockchainStorage");
var storage = new BlockchainStorage_1.BlockchainStorage();
var BlockchainState = /** @class */ (function (_super) {
    __extends(BlockchainState, _super);
    // private log: ILogger;
    function BlockchainState() {
        var _this = _super.call(this) || this;
        _this.operator = new BlockchainOperator_1.BlockchainOperator();
        // private events: EventEmitter = new EventEmitter();
        _this.txpool = [];
        _this.chain = [];
        return _this;
    }
    BlockchainState.prototype.getChainState = function () {
        return this.chain;
    };
    BlockchainState.prototype.getTxPoolState = function () {
        return this.txpool;
    };
    // adds a tx to the cached txs, to be included inside the block.
    BlockchainState.prototype.addTransaction = function (tx) {
        var validation = this.operator.validateTransaction(this.chain, tx, this.txpool);
        if (validation.success)
            this.txpool.push(tx);
        this.emit("change");
        return validation;
    };
    BlockchainState.prototype.logTxPool = function (msg) {
        console.log(msg, JSON.stringify(this.txpool.map(function (el) { return el.header.signature; }), null, 4));
    };
    // updates the chain state and updates the transaction
    // cache to remove the ones that are included inside the blocks
    // that changed
    BlockchainState.prototype.setChainState = function (chain) {
        var _a;
        var _this = this;
        this.logTxPool("BEFORE");
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
            _this.removeBlockTransactionsFromTxPool(block);
        });
        (_a = this.chain).splice.apply(_a, __spreadArray([changeIndex,
            this.chain.length - changeIndex], chainToAppend));
        this.logTxPool("AFTER");
        this.emit("change");
        storage.saveBlockchain(this.chain);
    };
    BlockchainState.prototype.removeBlockTransactionsFromTxPool = function (block) {
        this.txpool = this.txpool.filter(function (tx) {
            var found = block.payload.txs.find(function (btx) { return btx.header.signature === tx.header.signature; });
            return !found;
        });
    };
    return BlockchainState;
}(events_1.default));
exports.BlockchainState = BlockchainState;
//# sourceMappingURL=BlockchainState.js.map