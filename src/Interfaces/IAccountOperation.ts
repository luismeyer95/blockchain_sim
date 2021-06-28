import { z } from "zod";

export default interface IAccountOperation {
    // public key of account
    address: string;

    // positive/negative number added to the last balance of the account
    // representing its state change in the context of a tx
    operation: number;

    // base64 signature hash of the last tx referencing the account's balance
    last_ref: string | null;

    // newly computed balance of the account using last_ref's balance
    updated_balance: number;
}

export const AccountOperationValidator = z.object({
    address: z.string(),
    operation: z.number(),
    last_ref: z.string().or(z.null()),
    updated_balance: z.number(),
});

export type AccountOperationType = z.infer<typeof AccountOperationValidator>;
