import { KeyPairKeyObjectResult } from "crypto";
import { KeyObject } from "crypto";
import { AccountTransactionType } from "src/BlockchainDataFactory/IAccountTransaction";

export default interface IBlockchainWallet {
    submitTransaction(dest: KeyObject, amount: number, fee: number): void;
    onTransaction(fn: (tx: AccountTransactionType) => void): void;
}
