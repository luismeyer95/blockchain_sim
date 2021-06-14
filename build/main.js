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
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNonce = void 0;
var Encryption_1 = require("./Encryption/Encryption");
var findNonce = function (data, leadingZeroBits) {
    if (leadingZeroBits < 0 || leadingZeroBits >= 32)
        throw new Error("findNonce error: invalid leadingZeroBits argument");
    console.log(data);
    var bitstr = "0".repeat(32 - leadingZeroBits).padStart(32, "1");
    var bitnum = parseInt(bitstr, 2);
    var obj = __assign(__assign({}, data), { nonce: 0 });
    var u32, hashRes, buf;
    do {
        hashRes = Encryption_1.hash(Buffer.from(JSON.stringify(obj)));
        buf = hashRes.copy().digest();
        u32 = buf.readUInt32BE();
        obj.nonce += 1;
    } while (u32 & bitnum);
    return { hash: buf, nonce: obj.nonce - 1 };
};
exports.findNonce = findNonce;
var lol = {
    ho: "ha",
    hash: "lol",
    nonce: "ha",
};
var res = exports.findNonce(lol, 10);
console.log(res);
function printObj(obj) {
    console.log(obj);
}
printObj({
    // name: "luis",
    email: "a@b",
    age: 86,
});
