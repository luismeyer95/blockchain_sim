import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import { SuccessErrorCallbacks } from "src/Utils/SuccessErrorCallbacks";
import { z } from "zod";

// export type BlockRangeValidationResult =
//     | {
//           success: true;
//           chain: unknown[];
//       }
//     | {
//           success: false;
//           missing: [number, number] | null;
//       };

// export type TransactionValidationResult =
//     | {
//           success: true;
//       }
//     | {
//           success: false;
//           message: string;
//       };

export type TransactionInfo = {
    from: KeyObject;
    to: KeyObject;
    amount: number;
    fee: number;
};

export interface IBlockchainOperator {
    validateBlockRange(
        chain: unknown[],
        blocks: unknown[],
        callbacks: SuccessErrorCallbacks<unknown[], [number, number] | null>
    ): void;

    validateTransaction(
        tx: unknown,
        chain: unknown[],
        txpool: unknown[],
        callbacks: SuccessErrorCallbacks<void, string>
    ): void;

    getTransactionShapeValidator(): z.ZodAny;
    getBlockShapeValidator(): z.ZodAny;

    createTransaction(
        info: TransactionInfo,
        privateKey: KeyObject,
        chain: unknown[],
        txpool: unknown[]
    ): unknown;

    createBlockTemplate(
        keypair: KeyPairKeyObjectResult,
        chain: unknown[],
        txpool: unknown[]
    ): unknown;
}
