import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import { z } from "zod";

export type BlockRangeValidationResult =
    | {
          success: true;
          chain: unknown[];
      }
    | {
          success: false;
          missing: [number, number] | null;
      };

export type TransactionValidationResult =
    | {
          success: true;
      }
    | {
          success: false;
          message: string;
      };

export type TransactionInfo = {
    from: {
        address: KeyObject;
    };
    to: Array<{
        address: KeyObject;
        amount: number;
    }>;
    fee: number;
};

export interface IBlockchainOperator {
    validateBlockRange(
        chain: unknown[],
        blocks: unknown[]
    ): BlockRangeValidationResult;

    validateTransaction(
        chain: unknown[],
        tx: unknown
    ): TransactionValidationResult;

    getTransactionShapeValidator(): z.ZodAny;
    getBlockShapeValidator(): z.ZodAny;

    createTransaction(
        chain: unknown[],
        info: TransactionInfo,
        privateKey: KeyObject
    ): unknown;
}
