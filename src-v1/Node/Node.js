"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
var Encryption_1 = require("../Encryption/Encryption");
var utils_1 = require("../utils");
// import _, { has, initial, last } from "lodash";
var Block_1 = require("../Block/Block");
var Transactions_1 = require("../Transactions/Transactions");
var NodeProtocol_1 = __importDefault(require("src/NodeProtocol/NodeProtocol"));
var SwarmNet_1 = __importDefault(require("src/NodeNet/SwarmNet"));
var Loggers_1 = require("src/Logger/Loggers");
var utils_2 = require("src/utils");
var Node = /** @class */ (function () {
    function Node(blockchain, protocol, net, logger) {
        if (protocol === void 0) { protocol = new NodeProtocol_1.default(); }
        if (net === void 0) { net = new SwarmNet_1.default(); }
        if (logger === void 0) { logger = Loggers_1.log; }
        this.blockchain = blockchain !== null && blockchain !== void 0 ? blockchain : [];
        this.pendingTransactions = [];
        this.protocol = protocol;
        this.net = net;
        this.log = logger;
        this.ctorDispatcher = new utils_2.TwoWayMap([Transactions_1.InitialTransaction, this.receiveTransaction.bind(this)], [Transactions_1.SignedTransaction, this.receiveTransaction.bind(this)], [Block_1.Block, this.receiveBlock.bind(this)]);
        this.hookToNetwork();
    }
    Node.prototype.hookToNetwork = function () {
        var _this = this;
        this.net.on("payload", function (payload) {
            _this.log("[payload = " + JSON.stringify(payload) + "]\n");
            var resource = _this.protocol.interpretMessage(payload);
            if (!resource) {
                _this.log("[received bad protocol payload, ignored]\n");
                return;
            }
            var resourceHandler = _this.ctorDispatcher.getValue(resource.constructor);
            resourceHandler(resource);
        });
    };
    Node.prototype.receiveTransaction = function (tx) {
        try {
            var txstring = tx instanceof Transactions_1.InitialTransaction ? "initial_tx" : "signed_tx";
            this.log("[collecting received " + txstring + "]\n");
            this.collectTransaction(tx);
        }
        catch (err) {
            this.log("[received tx is invalid, ignored]\n");
        }
    };
    Node.prototype.receiveBlock = function (block) {
        // to implement
    };
    Node.prototype.createInitialTransaction = function (keypair, amount) {
        var initTx = new Transactions_1.InitialTransaction({
            output: { to: keypair.publicKey, amount: amount, balance: amount },
            timestamp: Date.now(),
        });
        this.collectTransaction(initTx);
        // broadcast tx here
        var message = this.protocol.createMessage(initTx);
        this.net.broadcast(message);
    };
    Node.prototype.createSignedTransaction = function (tx, privateKey) {
        var lastOutput = this.findLastTransactionOutput(tx.input.from);
        if (!lastOutput) {
            throw new Error("transaction error: missing last transaction output");
        }
        var txProcessed = tx;
        var findLTXO = this.findLastTransactionOutput.bind(this);
        txProcessed.outputs = txProcessed.outputs.map(function (output) {
            var _a, _b;
            var ltxo = (_b = (_a = findLTXO(output.to)) === null || _a === void 0 ? void 0 : _a.balance) !== null && _b !== void 0 ? _b : 0;
            return {
                to: output.to,
                amount: output.amount,
                balance: output.amount + ltxo,
            };
        });
        var remaining = lastOutput.balance - tx.getTotalAmount();
        txProcessed.outputs.push({
            to: tx.input.from,
            amount: remaining,
            balance: remaining,
        });
        txProcessed.sign(privateKey);
        this.collectTransaction(txProcessed);
        // broadcast tx here
        var message = this.protocol.createMessage(txProcessed);
        this.net.broadcast(message);
    };
    Node.prototype.collectTransaction = function (tx) {
        this.validateTransaction(tx);
        this.pendingTransactions.push(tx);
        this.pendingTransactions.sort(function (a, b) { return b.timestamp - a.timestamp; });
    };
    Node.prototype.validateTransaction = function (tx) {
        if (tx instanceof Transactions_1.SignedTransaction)
            this.validateTransactionData(tx);
        this.validateTransactionAgainstBlockchain(tx);
        this.validateTxAddressUnicityInPendingTxs(tx);
    };
    Node.prototype.validateTxAddressUnicityInPendingTxs = function (tx) {
        var err = new Error("transaction validation error:" +
            "address reference found in pending txs");
        if (tx instanceof Transactions_1.SignedTransaction) {
            this.pendingTransactions.forEach(function (ptx) {
                if (ptx.containsAddress(tx.input.from))
                    throw err;
                tx.outputs.forEach(function (output) {
                    if (ptx.containsAddress(output.to))
                        throw err;
                });
            });
        }
        else {
            this.pendingTransactions.forEach(function (ptx) {
                if (ptx.containsAddress(tx.output.to))
                    throw err;
            });
        }
    };
    Node.prototype.validateTransactionAgainstBlockchain = function (tx) {
        if (tx instanceof Transactions_1.SignedTransaction) {
            var lastOutput = this.findLastTransactionOutput(tx.input.from);
            if (lastOutput && lastOutput.balance) {
                if (tx.getTotalAmount() > lastOutput.balance)
                    throw new Error("transaction error: insufficient account funds");
                if (tx.getTotalAmount() < lastOutput.balance)
                    throw new Error("transaction error: unspent input");
            }
            else {
                throw new Error("transaction error: no funds on this account");
            }
        }
        else {
            var lastOutput = this.findLastTransactionOutput(tx.output.to);
            if (lastOutput)
                throw new Error("transaction error: cannot create initial transaction on funded account");
        }
    };
    Node.prototype.validateTransactionData = function (tx) {
        if (!tx.isValid())
            throw new Error("transaction creation error: invalid transaction data");
    };
    Node.prototype.findLastTransactionOutput = function (publicKey) {
        if (this.blockchain.length === 0)
            return null;
        var output = utils_1.dig(this.blockchain, function (block) {
            return utils_1.dig(block.transactions, function (tx) {
                if (tx instanceof Transactions_1.SignedTransaction) {
                    return utils_1.dig(tx.outputs, function (output) {
                        if (Encryption_1.serializeKey(output.to) ===
                            Encryption_1.serializeKey(publicKey))
                            return output;
                    });
                }
                else {
                    return Encryption_1.serializeKey(tx.output.to) ===
                        Encryption_1.serializeKey(publicKey)
                        ? tx.output
                        : null;
                }
            });
        });
        return output !== null && output !== void 0 ? output : null;
    };
    Node.prototype.mineBlock = function () {
        var _a;
        if (this.pendingTransactions.length === 0)
            return;
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
