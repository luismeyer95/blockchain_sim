import { z } from "zod";
import IAccountOperation, {
    AccountOperationValidator,
} from "./IAccountOperation";

export const CoinbaseTransactionValidator = z.object({
    header: z.object({
        // base64 string representation of the coinbase payload hash
        // hash: z.string(),
        // base64 string representation of the tx payload signed
        // with the MINER's private key.
        signature: z.string(),
    }),

    payload: z.object({
        // operation must be block reward + sum(fees) of containing block
        to: AccountOperationValidator,
    }),
});

export type CoinbaseTransactionType = z.infer<
    typeof CoinbaseTransactionValidator
>;
