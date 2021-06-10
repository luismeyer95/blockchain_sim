"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletAccount = void 0;
var RSAEncryption_1 = require("./RSAEncryption");
var WalletAccount = /** @class */ (function () {
    function WalletAccount(keypair) {
        if (!keypair)
            this.keypair = RSAEncryption_1.genKeyPair();
        else if ("privateKey" in keypair && "publicKey" in keypair)
            this.keypair = keypair;
        else
            this.keypair = RSAEncryption_1.deserializeKeyPair(keypair);
    }
    return WalletAccount;
}());
exports.WalletAccount = WalletAccount;
