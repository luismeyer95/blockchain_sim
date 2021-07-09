"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = __importDefault(require("crypto"));
var Encryption_1 = require("./Encryption");
describe("Encryption module tests", function () {
    var acc1;
    var signAndVerify = function (acc1, acc2) {
        var dataToSign = Buffer.from("giraffe");
        var signature = Encryption_1.sign(dataToSign, acc1.privateKey);
        var valid = Encryption_1.verify(dataToSign, acc1.publicKey, signature);
        expect(valid).toEqual(true);
        signature = Encryption_1.sign(dataToSign, acc2.privateKey);
        valid = Encryption_1.verify(dataToSign, acc1.publicKey, signature);
        expect(valid).toEqual(false);
    };
    beforeEach(function () { return (acc1 = Encryption_1.genKeyPair()); });
    test("signing and verifying buffers", function () {
        signAndVerify(acc1, Encryption_1.genKeyPair());
    });
    test("serializing-deserialize does not compromise key pairs", function () {
        var serial = Encryption_1.serializeKeyPair(acc1);
        var back = Encryption_1.deserializeKeyPair(serial);
        signAndVerify(back, Encryption_1.genKeyPair());
    });
    test("hash", function () {
        var h = Encryption_1.hash(Buffer.from("giraffe")).digest();
        var cmp = crypto_1.default.createHash("sha256").update("giraffe").digest();
        expect(h.compare(cmp)).toBe(0);
    });
    test("find nonce", function () {
        var obj = {
            name: "luis",
            age: 26,
        };
        var _a = Encryption_1.findNonce(obj, 12), hash = _a.hash, nonce = _a.nonce;
        var u32 = hash.readUInt32LE();
        var mask = u32 & 0x0000f0ff;
        expect(mask).toEqual(0);
        expect(Encryption_1.findNonce.bind(null, obj, -1)).toThrow();
        expect(Encryption_1.findNonce.bind(null, obj, 33)).toThrow();
    });
});
