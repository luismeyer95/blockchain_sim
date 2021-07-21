"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BlockchainOperator_1 = require("src/BlockchainDataFactory/BlockchainOperator");
var stream_1 = require("stream");
var BlockchainWallet = /** @class */ (function () {
    function BlockchainWallet(keypair, state) {
        this.operator = new BlockchainOperator_1.BlockchainOperator();
        this.events = new stream_1.EventEmitter();
        this.keypair = keypair;
        this.state = state;
    }
    BlockchainWallet.prototype.submitTransaction = function (dest, amount, fee) {
        var txinfo = {
            from: this.keypair.publicKey,
            to: dest,
            amount: amount,
            fee: fee,
        };
        var tx = this.operator.createTransaction(txinfo, this.keypair.privateKey, this.state.getChainState(), this.state.getTxPoolState());
        this.events.emit("tx", tx);
    };
    BlockchainWallet.prototype.onTransaction = function (fn) {
        this.events.on("tx", fn);
    };
    return BlockchainWallet;
}());
exports.default = BlockchainWallet;
//# sourceMappingURL=BlockchainWallet.js.map