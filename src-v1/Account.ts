import crypto, {
    createPublicKey,
    KeyObject,
    KeyPairKeyObjectResult,
} from "crypto";
import {
    genKeyPair,
    sign,
    verify,
    hash,
    Base64SerializedKey,
    Base64SerializedKeyPair,
    deserializeKeyPair,
} from "./Encryption/Encryption";

export class WalletAccount {
    public keypair: KeyPairKeyObjectResult;

    constructor(keypair?: Base64SerializedKeyPair | KeyPairKeyObjectResult) {
        if (!keypair) this.keypair = genKeyPair();
        else if ("privateKey" in keypair && "publicKey" in keypair)
            this.keypair = keypair as KeyPairKeyObjectResult;
        else this.keypair = deserializeKeyPair(keypair);
    }
}
