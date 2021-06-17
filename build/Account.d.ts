/// <reference types="node" />
import { KeyPairKeyObjectResult } from "crypto";
import { Base64SerializedKeyPair } from "./Encryption/Encryption";
export declare class WalletAccount {
    keypair: KeyPairKeyObjectResult;
    constructor(keypair?: Base64SerializedKeyPair | KeyPairKeyObjectResult);
}
