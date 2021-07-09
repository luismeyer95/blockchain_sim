"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BlockchainOperator_1 = require("src/BlockchainDataFactory/BlockchainOperator");
var BlockchainDataFactory = /** @class */ (function () {
    function BlockchainDataFactory() {
    }
    BlockchainDataFactory.prototype.createChainOperatorInstance = function () {
        return new BlockchainOperator_1.BlockchainOperator();
    };
    BlockchainDataFactory.prototype.createMinerInstance = function () {
        return new BlockchainMiner();
    };
    BlockchainDataFactory.prototype.getFactoryId = function () {
        return "meyercoin";
    };
    return BlockchainDataFactory;
}());
exports.default = BlockchainDataFactory;
