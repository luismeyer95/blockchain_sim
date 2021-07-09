"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNonceGold = exports.keyEquals = exports.deserializeKeyPair = exports.serializeKeyPair = exports.serializeKey = exports.deserializeKey = exports.hash = exports.genKeyPair = exports.verify = exports.sign = void 0;
var crypto_1 = __importDefault(require("crypto"));
var sign = function (data, privateKey) {
    return crypto_1.default.sign("sha256", data, {
        key: privateKey,
        padding: crypto_1.default.constants.RSA_PKCS1_PSS_PADDING,
    });
};
exports.sign = sign;
var verify = function (data, publicKey, signature) {
    return crypto_1.default.verify("sha256", data, {
        key: publicKey,
        padding: crypto_1.default.constants.RSA_PKCS1_PSS_PADDING,
    }, signature);
};
exports.verify = verify;
var genKeyPair = function () {
    return crypto_1.default.generateKeyPairSync("rsa", {
        // The standard secure default length for RSA keys is 2048 bits
        modulusLength: 2048,
    });
};
exports.genKeyPair = genKeyPair;
var hash = function (data) {
    return crypto_1.default.createHash("sha256").update(data);
};
exports.hash = hash;
function deserializeKey(key, type) {
    var dskey = type === "public"
        ? crypto_1.default.createPublicKey(key)
        : crypto_1.default.createPrivateKey(key);
    // the following operation defines the asymmetricKeyType
    // and restores the og state for some reason
    dskey.asymmetricKeyType;
    return dskey;
}
exports.deserializeKey = deserializeKey;
function serializeKey(key) {
    debugger;
    var serializedKey = key.export({
        type: "pkcs1",
        format: "pem",
    });
    return serializedKey.toString();
}
exports.serializeKey = serializeKey;
function serializeKeyPair(keypair) {
    return {
        privateKey: serializeKey(keypair.privateKey),
        publicKey: serializeKey(keypair.publicKey),
    };
}
exports.serializeKeyPair = serializeKeyPair;
function deserializeKeyPair(serializedKeyPair) {
    return {
        publicKey: deserializeKey(serializedKeyPair.publicKey, "public"),
        privateKey: deserializeKey(serializedKeyPair.privateKey, "private"),
    };
}
exports.deserializeKeyPair = deserializeKeyPair;
function keyEquals(a, b) {
    return serializeKey(a) === serializeKey(b);
}
exports.keyEquals = keyEquals;
function isNonceGold(nonce, data, leadingZeroBits) {
    if (leadingZeroBits <= 0 || leadingZeroBits > 32)
        throw new Error("error: invalid leading zero bits argument");
    var shift = 1 << (32 - leadingZeroBits);
    var bitnum = ~(shift - 1);
    var input = JSON.stringify({
        nonce: nonce,
        data: data,
    });
    var hashRes = exports.hash(Buffer.from(input));
    var buf = hashRes.copy().digest();
    var u32 = buf.readUInt32BE();
    var success = (u32 & bitnum) === 0;
    if (!success)
        return { success: false };
    return {
        success: success,
        hash: buf,
    };
}
exports.isNonceGold = isNonceGold;
