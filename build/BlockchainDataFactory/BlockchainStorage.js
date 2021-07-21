"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainStorage = void 0;
var Encryption_1 = require("src/Encryption/Encryption");
var fs_1 = __importDefault(require("fs"));
var BlockchainStorage = /** @class */ (function () {
    function BlockchainStorage() {
    }
    BlockchainStorage.prototype.loadBlockchain = function () {
        try {
            var path = process.env.PWD + "/storage/chain.json";
            return require(path);
        }
        catch (_a) {
            return [];
        }
    };
    BlockchainStorage.prototype.saveBlockchain = function (chain) {
        var path = process.env.PWD + "/storage/chain.json";
        fs_1.default.writeFileSync(path, JSON.stringify(chain, null, 4));
    };
    BlockchainStorage.prototype.loadAccount = function (refString) {
        var path = process.env.PWD + "/storage/accounts/" + refString + ".json";
        var obj = require(path);
        var keypair = Encryption_1.deserializeKeyPair(obj);
        return keypair;
    };
    BlockchainStorage.prototype.saveAccount = function (keypair, refString) {
        var path = process.env.PWD + "/storage/accounts/" + refString + ".json";
        var obj = Encryption_1.serializeKeyPair(keypair);
        fs_1.default.writeFileSync(path, JSON.stringify(obj, null, 4));
    };
    return BlockchainStorage;
}());
exports.BlockchainStorage = BlockchainStorage;
//# sourceMappingURL=BlockchainStorage.js.map