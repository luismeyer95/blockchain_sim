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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = exports.InitialTransaction = exports.SignedTransaction = void 0;
var RSAEncryption_1 = require("./RSAEncryption");
var utils_1 = require("./utils");
var lodash_1 = __importDefault(require("lodash"));
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
        var signable = this.makeSignableObject();
        return RSAEncryption_1.verify(Buffer.from(JSON.stringify(signable)), this.input.from, this.signature);
    };
    SignedTransaction.prototype.makeSignableObject = function () {
        // console.log(this.input.from);
        var input = {
            from: RSAEncryption_1.serializeKey(this.input.from),
        };
        var outputs = this.outputs
            .slice()
            .map(function (output) {
            return {
                to: RSAEncryption_1.serializeKey(output.to),
                amount: output.amount,
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
        this.signature = RSAEncryption_1.sign(Buffer.from(JSON.stringify(this.makeSignableObject())), privateKey);
    };
    SignedTransaction.prototype.serialize = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.isValid())
            throw new Error("transaction error: trying to serialize invalid transaction");
        var signable = this.makeSignableObject();
        var signature = (_a = this.signature) === null || _a === void 0 ? void 0 : _a.toString("base64");
        return JSON.stringify.apply(JSON, __spreadArray([__assign(__assign({}, signable), { signature: signature })], args));
    };
    SignedTransaction.prototype.deserialize = function (tx) {
        var _a = JSON.parse(tx), input = _a.input, outputs = _a.outputs, signature = _a.signature, timestamp = _a.timestamp;
        this.input = { from: RSAEncryption_1.deserializeKey(input.from, "public") };
        this.outputs = outputs.map(function (output) {
            return {
                to: RSAEncryption_1.deserializeKey(output.to, "public"),
                amount: output.amount,
            };
        });
        this.signature = Buffer.from(signature, "base64");
        if (!timestamp)
            throw new Error("transaction deserialize error: no timestamp");
        this.timestamp = timestamp;
    };
    return SignedTransaction;
}());
exports.SignedTransaction = SignedTransaction;
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
                to: RSAEncryption_1.serializeKey(output.to),
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
var Block = /** @class */ (function () {
    function Block() {
        this.transactions = [];
    }
    return Block;
}());
var Node = /** @class */ (function () {
    function Node(keypair) {
        if (keypair === void 0) { keypair = RSAEncryption_1.genKeyPair(); }
        this.blockchain = [];
        this.pendingTransactions = [];
        this.keypair = keypair;
        if (!this.findLastTransactionOutput(keypair.publicKey))
            this.createInitialTransaction(this.keypair, 10);
    }
    Node.prototype.createInitialTransaction = function (keypair, amount) {
        var initTx = new InitialTransaction({
            outputs: [{ to: keypair.publicKey, amount: amount }],
            timestamp: Date.now(),
        });
        this.validateTransactionData(initTx);
        this.validateTransactionSignature(initTx);
        this.broadcastTransaction(initTx);
    };
    Node.prototype.findLastTransactionOutput = function (publicKey) {
        var output = utils_1.dig(this.blockchain, function (block) {
            return utils_1.dig(block.transactions, function (tx) {
                return utils_1.dig(tx.outputs, function (output) {
                    if (output.to === publicKey)
                        return output;
                });
            });
        });
        return output;
    };
    Node.prototype.signAndCreateTransaction = function (tx, privateKey) {
        var lastOutput = this.findLastTransactionOutput(tx.input.from);
        if (!lastOutput) {
            throw new Error("transaction error: missing last transaction output");
        }
        var txProcessed = lodash_1.default.cloneDeep(tx);
        txProcessed.outputs.push({
            to: lodash_1.default.cloneDeep(tx.input.from),
            amount: lastOutput.amount - tx.getTotalAmount(),
        });
        txProcessed.sign(privateKey);
        this.validateTransactionData(txProcessed);
        this.validateTransactionSignature(txProcessed);
        this.broadcastTransaction(txProcessed);
    };
    Node.prototype.validateTransactionData = function (tx) {
        var _this = this;
        if (tx instanceof SignedTransaction) {
            var lastOutput = this.findLastTransactionOutput(tx.input.from);
            if (lastOutput) {
                if (tx.getTotalAmount() > lastOutput.amount)
                    throw new Error("transaction error: insufficient account funds");
                if (tx.getTotalAmount() < lastOutput.amount)
                    throw new Error("transaction error: unspent input");
            }
            else {
                throw new Error("transaction error: no funds on this account");
            }
        }
        else {
            tx.outputs.forEach(function (output) {
                var lastOutput = _this.findLastTransactionOutput(output.to);
                if (lastOutput)
                    throw new Error("transaction error: cannot create initial transaction on funded account");
            });
        }
    };
    Node.prototype.validateTransactionSignature = function (tx) {
        if (tx instanceof InitialTransaction) {
            return;
        }
        else {
            if (!tx.isValid())
                throw new Error("transaction creation error: invalid transaction signature");
        }
    };
    Node.prototype.broadcastTransaction = function (tx) {
        this.pendingTransactions.push(tx);
    };
    Node.prototype.mineBlock = function () {
        var _a;
        var block = new Block();
        this.pendingTransactions.sort(function (a, b) { return b.timestamp - a.timestamp; });
        (_a = block.transactions).unshift.apply(_a, this.pendingTransactions);
        this.pendingTransactions = [];
        this.blockchain.unshift(block);
    };
    return Node;
}());
exports.Node = Node;
