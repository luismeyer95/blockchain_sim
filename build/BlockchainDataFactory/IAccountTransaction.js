"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountTransactionValidator = void 0;
var IAccountOperation_1 = require("./IAccountOperation");
var zod_1 = require("zod");
// regular account movement transaction
// can be verified by stakeholders by applying verification of the signature
// using the source acccount's public key
exports.AccountTransactionValidator = zod_1.z.object({
    header: zod_1.z.object({
        // base64 string representation of the tx payload hash
        // hash: z.string(),
        // base64 string representation of the tx payload signed
        // with the source account private key
        signature: zod_1.z.string(),
    }),
    // encapsulates signable props to make it easier to hash/sign
    payload: zod_1.z.object({
        // operation should be - for from and + for to
        // nodes validate that from.operation + sum(to[].operation) + miner_fee === 0
        // source account must have a last_ref!
        from: IAccountOperation_1.AccountOperationValidator,
        to: IAccountOperation_1.AccountOperationValidator,
        miner_fee: zod_1.z.number(),
    }),
});
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
//# sourceMappingURL=IAccountTransaction.js.map