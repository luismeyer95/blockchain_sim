"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinbaseTransactionValidator = void 0;
var zod_1 = require("zod");
var IAccountOperation_1 = require("./IAccountOperation");
exports.CoinbaseTransactionValidator = zod_1.z.object({
    header: zod_1.z.object({
        // base64 string representation of the coinbase payload hash
        // hash: z.string(),
        // base64 string representation of the tx payload signed
        // with the MINER's private key.
        signature: zod_1.z.string(),
    }),
    payload: zod_1.z.object({
        // operation must be block reward + sum(fees) of containing block
        to: IAccountOperation_1.AccountOperationValidator,
        // unix time
        // important: a transaction timestamp older than the last mined block's timestamp
        // should be considered invalid
        timestamp: zod_1.z.number(),
    }),
});
//# sourceMappingURL=ICoinbaseTransaction.js.map