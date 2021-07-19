import IAccountOperation, {
    AccountOperationValidator,
} from "./IAccountOperation";
import { z } from "zod";

// regular account movement transaction
// can be verified by stakeholders by applying verification of the signature
// using the source acccount's public key
export const AccountTransactionValidator = z.object({
    header: z.object({
        // base64 string representation of the tx payload hash
        // hash: z.string(),
        // base64 string representation of the tx payload signed
        // with the source account private key
        signature: z.string(),
    }),
    // encapsulates signable props to make it easier to hash/sign
    payload: z.object({
        // operation should be - for from and + for to
        // nodes validate that from.operation + sum(to[].operation) + miner_fee === 0
        // source account must have a last_ref!
        from: AccountOperationValidator,
        to: AccountOperationValidator,
        miner_fee: z.number(),
    }),
});

export type AccountTransactionType = z.infer<
    typeof AccountTransactionValidator
>;

// export interface IAccountTransaction {
//     getTimestamp: () => number;
// }

// export interface AccountTransactionCtor {
//     new (serial: string): IAccountTransaction;
// }

// export class AccountTransaction implements IAccountTransaction {
//     private tx: AccountTransactionType;

//     constructor(serial: string) {
//         const obj = JSON.parse(serial);
//         const txValidation = AccountTransactionValidator.safeParse(obj);
//         if (txValidation.success) {
//             this.tx = txValidation.data;
//         } else {
//             throw new Error("data shape error");
//         }
//     }

//     getTimestamp() {
//         return this.tx.payload.timestamp;
//     }
// }
