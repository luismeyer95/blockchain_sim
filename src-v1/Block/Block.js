"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Block = void 0;
var SignedTransaction_1 = require("../Transactions/SignedTransaction");
var InitialTransaction_1 = require("../Transactions/InitialTransaction");
var Block = /** @class */ (function () {
    function Block(block) {
        var _a, _b;
        this.nonce = 0;
        this.timestamp = block === null || block === void 0 ? void 0 : block.timestamp;
        this.nonce = (_a = block === null || block === void 0 ? void 0 : block.nonce) !== null && _a !== void 0 ? _a : 0;
        this.hash = block === null || block === void 0 ? void 0 : block.hash;
        this.timestamp = block === null || block === void 0 ? void 0 : block.timestamp;
        this.transactions = (_b = block === null || block === void 0 ? void 0 : block.transactions) !== null && _b !== void 0 ? _b : [];
    }
    Block.prototype.serialize = function () {
        var _a, _b;
        var obj = {
            timestamp: this.timestamp,
            nonce: this.nonce,
            hash: (_a = this.hash) === null || _a === void 0 ? void 0 : _a.toString("base64"),
            previousHash: (_b = this.previousHash) === null || _b === void 0 ? void 0 : _b.toString("base64"),
            transactions: this.transactions.map(function (tx) { return tx.serialize(); }),
        };
        return JSON.stringify(obj);
    };
    Block.prototype.deserialize = function (json) {
        try {
            var _a = JSON.parse(json), timestamp = _a.timestamp, nonce = _a.nonce, hash_1 = _a.hash, previousHash = _a.previousHash, transactions = _a.transactions;
            this.timestamp = timestamp;
            this.nonce = nonce;
            this.hash = Buffer.from(hash_1, "base64");
            this.previousHash = Buffer.from(previousHash, "base64");
            this.transactions = transactions.map(function (tx) {
                if (SignedTransaction_1.SignedTransaction.isSignedTransaction(tx))
                    return new SignedTransaction_1.SignedTransaction(tx);
                return new InitialTransaction_1.InitialTransaction(tx);
            });
        }
        catch (_b) {
            console.error("block deserialize error");
        }
    };
    return Block;
}());
exports.Block = Block;
