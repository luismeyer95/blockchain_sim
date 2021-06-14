"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
var Encryption_1 = require("../Encryption/Encryption");
var utils_1 = require("../utils");
var Block_1 = require("../Block/Block");
var Transactions_1 = require("../Transactions/Transactions");
var Node = /** @class */ (function () {
    function Node(keypair) {
        if (keypair === void 0) { keypair = Encryption_1.genKeyPair(); }
        this.blockchain = [];
        this.pendingTransactions = [];
        this.keypair = keypair;
        if (!this.findLastTransactionOutput(keypair.publicKey))
            this.createInitialTransaction(this.keypair, 10);
    }
    Node.prototype.createInitialTransaction = function (keypair, amount) {
        var initTx = new Transactions_1.InitialTransaction({
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
        var txProcessed = tx;
        txProcessed.outputs.push({
            to: tx.input.from,
            amount: lastOutput.amount - tx.getTotalAmount(),
        });
        txProcessed.sign(privateKey);
        this.validateTransactionData(txProcessed);
        this.validateTransactionSignature(txProcessed);
        this.broadcastTransaction(txProcessed);
    };
    Node.prototype.validateTransactionData = function (tx) {
        var _this = this;
        if (tx instanceof Transactions_1.SignedTransaction) {
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
        if (tx instanceof Transactions_1.InitialTransaction) {
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
        var block = new Block_1.Block();
        this.pendingTransactions.sort(function (a, b) { return b.timestamp - a.timestamp; });
        (_a = block.transactions).unshift.apply(_a, this.pendingTransactions);
        this.pendingTransactions = [];
        this.blockchain.unshift(block);
    };
    Node.prototype.printBlockchain = function () {
        console.log(JSON.stringify(this.blockchain.slice().map(function (block) {
            block.transactions = block.transactions.map(function (tx) {
                return JSON.parse(tx.serialize());
            });
            return block;
        }), null, 2));
    };
    return Node;
}());
exports.Node = Node;
