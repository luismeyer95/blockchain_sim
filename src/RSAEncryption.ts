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
    const keyCreationParams = {
        key: Buffer.from(key, "base64"),
        type: "pkcs1",
        format: "der",
    };
    return type === "public"
        ? crypto.createPublicKey(keyCreationParams as crypto.PublicKeyInput)
        : crypto.createPrivateKey(keyCreationParams as crypto.PrivateKeyInput);
}

export function serializeKey(key: KeyObject): Base64SerializedKey {
    const serializedKey: Buffer = key.export({
        type: "pkcs1",
        format: "der",
    });
    return serializedKey.toString("base64");
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
