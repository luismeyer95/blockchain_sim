"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var BlockchainOperator_1 = require("src/BlockchainDataFactory/BlockchainOperator");
var IAccountTransaction_1 = require("src/BlockchainDataFactory/IAccountTransaction");
var IBlock_1 = require("src/BlockchainDataFactory/IBlock");
var BlockchainState_1 = require("./BlockchainState");
var BlockchainMiner_1 = require("./BlockchainMiner");
var BlockchainWallet_1 = __importDefault(require("./BlockchainWallet"));
var BlockchainDataFactory = /** @class */ (function () {
    function BlockchainDataFactory() {
    }
    BlockchainDataFactory.prototype.getTransactionShapeValidator = function () {
        return IAccountTransaction_1.AccountTransactionValidator;
    };
    BlockchainDataFactory.prototype.getBlockShapeValidator = function () {
        return IBlock_1.BlockValidator;
    };
    BlockchainDataFactory.prototype.createChainOperatorInstance = function () {
        return new BlockchainOperator_1.BlockchainOperator();
    };
    BlockchainDataFactory.prototype.createMinerInstance = function (keypair, state) {
        return new BlockchainMiner_1.BlockchainMiner(keypair, state);
    };
    BlockchainDataFactory.prototype.createStateInstance = function () {
        return new BlockchainState_1.BlockchainState();
    };
    BlockchainDataFactory.prototype.createWalletInstance = function (keypair, state) {
        return new BlockchainWallet_1.default(keypair, state);
    };
    return BlockchainDataFactory;
}());
exports.default = BlockchainDataFactory;
//# sourceMappingURL=BlockchainDataFactory.js.map