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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNonce = exports.deserializeKeyPair = exports.serializeKeyPair = exports.serializeKey = exports.deserializeKey = exports.hash = exports.genKeyPair = exports.verify = exports.sign = void 0;
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
    // const keyCreationParams = {
    //     key: Buffer.from(key, "base64"),
    //     type: "pkcs1",
    //     format: "pem",
    // };
    // return type === "public"
    //     ? crypto.createPublicKey(keyCreationParams as crypto.PublicKeyInput)
    //     : crypto.createPrivateKey(keyCreationParams as crypto.PrivateKeyInput);
    return type === "public"
        ? crypto_1.default.createPublicKey(key)
        : crypto_1.default.createPrivateKey(key);
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
var findNonce = function (data, leadingZeroBits) {
    if (leadingZeroBits < 0 || leadingZeroBits > 32)
        throw new Error("findNonce error: invalid leadingZeroBits argument");
    var bitstr = "0".repeat(32 - leadingZeroBits).padStart(32, "1");
    var bitnum = parseInt(bitstr, 2);
    var obj = __assign(__assign({}, data), { nonce: 0 });
    var u32, hashRes, buf;
    do {
        hashRes = exports.hash(Buffer.from(JSON.stringify(obj)));
        buf = hashRes.copy().digest();
        u32 = buf.readUInt32BE();
        obj.nonce += 1;
    } while (u32 & bitnum);
    return { hash: buf, nonce: obj.nonce - 1 };
};
exports.findNonce = findNonce;
