"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletAccount = void 0;
var Encryption_1 = require("./Encryption/Encryption");
var WalletAccount = /** @class */ (function () {
    function WalletAccount(keypair) {
        if (!keypair)
            this.keypair = Encryption_1.genKeyPair();
        else if ("privateKey" in keypair && "publicKey" in keypair)
            this.keypair = keypair;
        else
            this.keypair = Encryption_1.deserializeKeyPair(keypair);
    }
    return WalletAccount;
}());
exports.WalletAccount = WalletAccount;
