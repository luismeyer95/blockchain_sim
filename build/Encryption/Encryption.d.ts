/// <reference types="node" />
import crypto, { KeyObject, KeyPairKeyObjectResult } from "crypto";
export declare const sign: (data: Buffer, privateKey: KeyObject) => Buffer;
export declare const verify: (data: Buffer, publicKey: KeyObject, signature: Buffer) => boolean;
export declare const genKeyPair: () => crypto.KeyPairKeyObjectResult;
export declare const hash: (data: Buffer) => crypto.Hash;
export declare type Base64SerializedKey = string;
export declare type Base64SerializedKeyPair = {
    privateKey: Base64SerializedKey;
    publicKey: Base64SerializedKey;
};
export declare function deserializeKey(key: Base64SerializedKey, type: "public" | "private"): KeyObject;
export declare function serializeKey(key: KeyObject): Base64SerializedKey;
export declare function serializeKeyPair(keypair: KeyPairKeyObjectResult): Base64SerializedKeyPair;
export declare function deserializeKeyPair(serializedKeyPair: Base64SerializedKeyPair): KeyPairKeyObjectResult;
export declare function keyEquals(a: KeyObject, b: KeyObject): boolean;
declare type ExcludeHashNonce<T> = Omit<T, "hash" | "nonce"> extends T ? Omit<T, "hash" | "nonce"> : never;
export declare const findNonce: <T>(data: ExcludeHashNonce<T>, leadingZeroBits: number) => {
    hash: Buffer;
    nonce: number;
};
export {};
