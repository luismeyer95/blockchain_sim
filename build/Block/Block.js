"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Block = void 0;
var Encryption_1 = require("../Encryption/Encryption");
var Block = /** @class */ (function () {
    function Block() {
        this.nonce = 0;
        this.transactions = [];
    }
    Block.prototype.serialize = function () {
        return "";
    };
    Block.prototype.mine = function (nonce, leadingZeroBits) {
        if (leadingZeroBits < 0 || leadingZeroBits > 32)
            throw new Error("findNonce error: invalid leadingZeroBits argument");
        var bitstr = "0".repeat(32 - leadingZeroBits).padStart(32, "1");
        var bitnum = parseInt(bitstr, 2);
        var hashRes = Encryption_1.hash(Buffer.from(JSON.stringify(this)));
        var buf = hashRes.copy().digest();
        var u32 = buf.readUInt32BE();
        return !(u32 & bitnum);
    };
    return Block;
}());
exports.Block = Block;
