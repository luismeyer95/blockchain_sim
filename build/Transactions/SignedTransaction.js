"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignedTransaction = void 0;
var Encryption_1 = require("../Encryption/Encryption");
var SignedTransaction = /** @class */ (function () {
    function SignedTransaction(tx) {
        if (typeof tx === "string") {
            this.deserialize(tx);
        }
        else {
            this.input = tx.input;
            this.outputs = tx.outputs;
            this.signature = tx.signature;
            this.timestamp = tx.timestamp || Date.now();
        }
    }
    SignedTransaction.prototype.isValid = function () {
        if (!this.signature)
            return false;
        var validOutputs = true;
        this.outputs.forEach(function (output) {
            if (output.amount < 0)
                validOutputs = false;
            if (output.balance && output.balance < 0)
                validOutputs = false;
        });
        var signable = this.makeSignableObject();
        return (validOutputs &&
            Encryption_1.verify(Buffer.from(JSON.stringify(signable)), this.input.from, this.signature));
    };
    SignedTransaction.prototype.makeSignableObject = function () {
        var input = {
            from: Encryption_1.serializeKey(this.input.from),
        };
        var outputs = this.outputs
            .slice()
            .map(function (output) {
            return {
                to: Encryption_1.serializeKey(output.to),
                amount: output.amount,
                balance: output.balance,
            };
        });
        var timestamp = this.timestamp;
        return { input: input, outputs: outputs, timestamp: timestamp };
    };
    SignedTransaction.prototype.getTotalAmount = function () {
        var fullAmount = 0;
        this.outputs.forEach(function (output) { return (fullAmount += output.amount); });
        return fullAmount;
    };
    SignedTransaction.prototype.sign = function (privateKey) {
        this.signature = Encryption_1.sign(Buffer.from(JSON.stringify(this.makeSignableObject())), privateKey);
    };
    SignedTransaction.prototype.serialize = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.isValid()) {
            var strerror = "transaction error: trying to serialize invalid transaction";
            throw new Error(strerror);
        }
        var signable = this.makeSignableObject();
        var signature = this.signature.toString("base64");
        return JSON.stringify.apply(JSON, __spreadArray([__assign(__assign({}, signable), { signature: signature })], args));
    };
    SignedTransaction.prototype.deserialize = function (tx) {
        var _a = JSON.parse(tx), input = _a.input, outputs = _a.outputs, signature = _a.signature, timestamp = _a.timestamp;
        this.input = { from: Encryption_1.deserializeKey(input.from, "public") };
        this.outputs = outputs.map(function (output) {
            return {
                to: Encryption_1.deserializeKey(output.to, "public"),
                amount: output.amount,
                balance: output.balance,
            };
        });
        this.signature = Buffer.from(signature, "base64");
        if (!timestamp)
            throw new Error("transaction deserialize error: no timestamp");
        this.timestamp = timestamp;
    };
    SignedTransaction.prototype.containsAddress = function (key) {
        if (Encryption_1.keyEquals(key, this.input.from))
            return true;
        var ret = false;
        this.outputs.forEach(function (output) {
            if (Encryption_1.keyEquals(key, output.to))
                ret = true;
        });
        return ret;
    };
    return SignedTransaction;
}());
exports.SignedTransaction = SignedTransaction;
