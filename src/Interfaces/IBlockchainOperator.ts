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
    from: KeyObject;
    to: KeyObject;
    amount: number;
    fee: number;
};

export interface IBlockchainOperator {
    validateBlockRange(
        chain: unknown[],
        blocks: unknown[]
    ): BlockRangeValidationResult;

    validateTransaction(
        chain: unknown[],
        tx: unknown,
        txPool: unknown[]
    ): TransactionValidationResult;

    getTransactionShapeValidator(): z.ZodAny;
    getBlockShapeValidator(): z.ZodAny;

    createTransaction(
        info: TransactionInfo,
        privateKey: KeyObject,
        chain: unknown[],
        txPool: unknown[]
    ): unknown;

    createBlockTemplate(
        keypair: KeyPairKeyObjectResult,
        txs: unknown[],
        chain: unknown[]
    ): unknown;
}
