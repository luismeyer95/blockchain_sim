"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialTransaction = void 0;
var InputOutput_1 = require("./InputOutput");
var Encryption_1 = require("../Encryption/Encryption");
var InitialTransaction = /** @class */ (function () {
    function InitialTransaction(tx) {
        if (typeof tx === "string") {
            this.deserialize(tx);
        }
        else {
            this.output = tx.output;
            this.timestamp = tx.timestamp;
        }
    }
    InitialTransaction.isInitialTransaction = function (obj) {
        try {
            obj = new InitialTransaction(obj);
            return (InputOutput_1.isOutput(obj.output) &&
                typeof obj.timestamp === "number");
        }
        catch (_a) {
            return false;
        }
    };
    InitialTransaction.prototype.serialize = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var output = {
            to: Encryption_1.serializeKey(this.output.to),
            amount: this.output.amount,
            balance: this.output.balance,
        };
        var timestamp = this.timestamp;
        return JSON.stringify.apply(JSON, __spreadArray([{ output: output, timestamp: timestamp }], args));
    };
    InitialTransaction.prototype.deserialize = function (tx) {
        var _a = JSON.parse(tx), output = _a.output, timestamp = _a.timestamp;
        this.output = {
            to: Encryption_1.deserializeKey(output.to, "public"),
            amount: output.amount,
            balance: output.balance,
        };
        this.timestamp = timestamp;
    };
    InitialTransaction.prototype.containsAddress = function (key) {
        if (Encryption_1.keyEquals(key, this.output.to))
            return true;
    };
    return InitialTransaction;
}());
exports.InitialTransaction = InitialTransaction;
