"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialTransaction = void 0;
var Encryption_1 = require("../Encryption/Encryption");
var InitialTransaction = /** @class */ (function () {
    function InitialTransaction(tx) {
        if (typeof tx === "string") {
            this.deserialize(tx);
        }
        else {
            this.outputs = tx.outputs;
            this.timestamp = tx.timestamp;
        }
    }
    InitialTransaction.prototype.serialize = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var outputs = this.outputs
            .slice()
            .map(function (output) {
            return {
                to: Encryption_1.serializeKey(output.to),
                amount: output.amount,
            };
        });
        var timestamp = this.timestamp;
        return JSON.stringify.apply(JSON, __spreadArray([{ outputs: outputs, timestamp: timestamp }], args));
    };
    InitialTransaction.prototype.deserialize = function (tx) {
        var _a = JSON.parse(tx), outputs = _a.outputs, timestamp = _a.timestamp;
        this.outputs = outputs;
        this.timestamp = timestamp;
    };
    return InitialTransaction;
}());
exports.InitialTransaction = InitialTransaction;
