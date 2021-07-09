"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountOperationValidator = void 0;
var zod_1 = require("zod");
exports.AccountOperationValidator = zod_1.z.object({
    address: zod_1.z.string(),
    operation: zod_1.z.number(),
    last_ref: zod_1.z.string().or(zod_1.z.null()),
    updated_balance: zod_1.z.number(),
});
