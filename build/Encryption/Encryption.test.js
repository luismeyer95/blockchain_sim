"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
});
