import { z } from "zod";

export default interface IAccountOperation {
    // public key of account
    address: string;

    // positive/negative number added to the last balance of the account
    // representing its state change in the context of a tx
    operation: number;

    // a counter for the operation history of the account, prevents replay attacks
    op_nonce: number;

    // newly computed balance of the account using last_ref's balance
    updated_balance: number;
}

export const AccountOperationValidator = z.object({
    address: z.string(),
    operation: z.number(),
    op_nonce: z.number(),
    updated_balance: z.number(),
});

export type AccountOperationType = z.infer<typeof AccountOperationValidator>;
