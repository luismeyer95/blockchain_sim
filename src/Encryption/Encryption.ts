import { debug } from "console";
import crypto, { KeyObject, KeyPairKeyObjectResult } from "crypto";

export const sign = (data: Buffer, privateKey: KeyObject): Buffer => {
    return crypto.sign("sha256", data, {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    });
};

export const verify = (
    data: Buffer,
    publicKey: KeyObject,
    signature: Buffer
): boolean => {
    return crypto.verify(
        "sha256",
        data,
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        },
        signature
    );
};

export const genKeyPair = () => {
    return crypto.generateKeyPairSync("rsa", {
        // The standard secure default length for RSA keys is 2048 bits
        modulusLength: 2048,
    });
};

export const hash = (data: Buffer): crypto.Hash => {
    return crypto.createHash("sha256").update(data);
};

///

export type Base64SerializedKey = string;
export type Base64SerializedKeyPair = {
    privateKey: Base64SerializedKey;
    publicKey: Base64SerializedKey;
};

export function deserializeKey(
    key: Base64SerializedKey,
    type: "public" | "private"
): KeyObject {
    // const keyCreationParams = {
    //     key: Buffer.from(key, "base64"),
    //     type: "pkcs1",
    //     format: "pem",
    // };
    // return type === "public"
    //     ? crypto.createPublicKey(keyCreationParams as crypto.PublicKeyInput)
    //     : crypto.createPrivateKey(keyCreationParams as crypto.PrivateKeyInput);

    return type === "public"
        ? crypto.createPublicKey(key)
        : crypto.createPrivateKey(key);
}

export function serializeKey(key: KeyObject): Base64SerializedKey {
    debugger;
    const serializedKey = key.export({
        type: "pkcs1",
        format: "pem",
    });
    return serializedKey.toString();
}

export function serializeKeyPair(
    keypair: KeyPairKeyObjectResult
): Base64SerializedKeyPair {
    return {
        privateKey: serializeKey(keypair.privateKey),
        publicKey: serializeKey(keypair.publicKey),
    };
}

export function deserializeKeyPair(
    serializedKeyPair: Base64SerializedKeyPair
): KeyPairKeyObjectResult {
    return {
        publicKey: deserializeKey(serializedKeyPair.publicKey, "public"),
        privateKey: deserializeKey(serializedKeyPair.privateKey, "private"),
    };
}

export const findNonce = (data: any, leadingZeroBits: number) => {
    if (leadingZeroBits < 0 || leadingZeroBits >= 32)
        throw new Error("findNonce error: invalid leadingZeroBits argument");

    const bitstr = new Array(leadingZeroBits).fill(0);
    console.log(bitstr);

    const obj = { data, nonce: 0 };
    let u32, hashRes, buf;
    do {
        hashRes = hash(Buffer.from(JSON.stringify(obj)));
        buf = hashRes.copy().digest();
        u32 = buf.readUInt32BE();
        obj.nonce += 1;
    } while (u32 & 0xfffff000);

    // console.log(obj.nonce);

    return buf;
};
