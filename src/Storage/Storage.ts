import { KeyPairKeyObjectResult } from "crypto";
import {
    serializeKeyPair,
    deserializeKeyPair,
} from "src/Encryption/Encryption";
import fs from "fs";

export class Storage {
    static loadBlockchain(): unknown[] {
        try {
            const path = `${process.env.PWD}/storage/chain.json`;
            return require(path);
        } catch {
            return [];
        }
    }

    static saveBlockchain(chain: unknown[]) {
        const path = `${process.env.PWD}/storage/chain.json`;
        fs.writeFileSync(path, JSON.stringify(chain, null, 4));
    }

    static loadAccount(refString: string): KeyPairKeyObjectResult {
        const path = `${process.env.PWD}/storage/accounts/${refString}.json`;
        const obj = require(path);
        const keypair = deserializeKeyPair(obj);
        return keypair;
    }

    static saveAccount(keypair: KeyPairKeyObjectResult, refString: string) {
        const path = `${process.env.PWD}/storage/accounts/${refString}.json`;
        const obj = serializeKeyPair(keypair);
        fs.writeFileSync(path, JSON.stringify(obj, null, 4));
    }
}
