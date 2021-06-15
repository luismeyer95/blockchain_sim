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
    let dskey =
        type === "public"
            ? crypto.createPublicKey(key)
            : crypto.createPrivateKey(key);
    // the following operation defines the asymmetricKeyType
    // and restores the og state for some reason
    dskey.asymmetricKeyType;
    return dskey;
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

export function keyEquals(a: KeyObject, b: KeyObject) {
    return serializeKey(a) === serializeKey(b);
}

type ExcludeHashNonce<T> = Omit<T, "hash" | "nonce"> extends T
    ? Omit<T, "hash" | "nonce">
    : never;

export const findNonce = <T>(
    data: ExcludeHashNonce<T>,
    leadingZeroBits: number
): { hash: Buffer; nonce: number } => {
    if (leadingZeroBits < 0 || leadingZeroBits > 32)
        throw new Error("findNonce error: invalid leadingZeroBits argument");

    const bitstr = "0".repeat(32 - leadingZeroBits).padStart(32, "1");
    const bitnum = parseInt(bitstr, 2);

    const obj = { ...data, nonce: 0 };
    let u32, hashRes, buf;
    do {
        hashRes = hash(Buffer.from(JSON.stringify(obj)));
        buf = hashRes.copy().digest();
        u32 = buf.readUInt32BE();
        obj.nonce += 1;
    } while (u32 & bitnum);

    return { hash: buf, nonce: obj.nonce - 1 };
};
