"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockValidator = void 0;
var IAccountTransaction_1 = require("./IAccountTransaction");
var ICoinbaseTransaction_1 = require("./ICoinbaseTransaction");
var zod_1 = require("zod");
exports.BlockValidator = zod_1.z.object({
    header: zod_1.z.object({
        // base64 string representation of the block hash.
        // mining involves hashing the JSON.stringified payload
        // until a certain nonce makes the hash fulfill a complexity
        // requirement
        hash: zod_1.z.string(),
    }),
    // encapsulates signable props to make it easier to hash/sign
    payload: zod_1.z.object({
        // block's index in the blockchain
        index: zod_1.z.number().min(0),
        // unix time
        // important: a transaction timestamp older than the last mined block's timestamp
        // should be considered invalid
        timestamp: zod_1.z.number(),
        // the magic number that makes the block hash fulfill the complexity requirement
        nonce: zod_1.z.number(),
        // base64 string hash of the previous block
        // or null for genesis block
        previous_hash: zod_1.z.string().or(zod_1.z.null()),
        // miner's reward
        coinbase: ICoinbaseTransaction_1.CoinbaseTransactionValidator,
        // array of account transactions
        txs: zod_1.z.array(IAccountTransaction_1.AccountTransactionValidator),
    }),
});
