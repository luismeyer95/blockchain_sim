import { AccountTransactionValidator } from "./IAccountTransaction";
import { CoinbaseTransactionValidator } from "./ICoinbaseTransaction";

import { z } from "zod";

export const BlockValidator = z.object({
    header: z.object({
        // base64 string representation of the block hash.
        // mining involves hashing the JSON.stringified payload
        // until a certain nonce makes the hash fulfill a complexity
        // requirement
        hash: z.string(),
    }),

    // encapsulates signable props to make it easier to hash/sign
    payload: z.object({
        // block's index in the blockchain
        index: z.number().min(0),

        // unix time
        // important: a transaction timestamp older than the last mined block's timestamp
        // should be considered invalid
        timestamp: z.number(),

        // the magic number that makes the block hash fulfill the complexity requirement
        nonce: z.number(),

        // base64 string hash of the previous block
        // or null for genesis block
        previous_hash: z.string().or(z.null()),

        // miner's reward
        coinbase: CoinbaseTransactionValidator,

        // array of account transactions
        txs: z.array(AccountTransactionValidator),
    }),
});

export type BlockType = z.infer<typeof BlockValidator>;
