import { KeyPairKeyObjectResult } from "crypto";
import { KeyObject } from "crypto";

export default interface IBlockchainWallet {
    submitTransaction(dest: KeyObject, amount: number, fee: number): void;
    onTransaction(fn: (tx: unknown) => void): void;
}
