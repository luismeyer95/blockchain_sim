import { KeyPairKeyObjectResult } from "crypto";

export interface IBlockchainStorage {
    loadBlockchain(): unknown[];
    saveBlockchain(chain: unknown[]): void;
    loadAccount(refString: string): KeyPairKeyObjectResult;
    saveAccount(keypair: KeyPairKeyObjectResult, refString: string): void;
}
