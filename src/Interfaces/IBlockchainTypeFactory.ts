import { z } from "zod";
import { AccountTransactionCtor } from "./IAccountTransaction";
import { BlockCtor } from "./IBlock";

export interface IBlockchainTypeFactory {
    getBlockCtor: () => BlockCtor;
    getBlockShapeValidator: () => z.AnyZodObject;

    getTransactionCtor: () => AccountTransactionCtor;
    getTransactionShapeValidator: () => z.AnyZodObject;
}
