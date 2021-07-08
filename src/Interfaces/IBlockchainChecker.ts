type BlockRangeValidationResult =
    | {
          success: true;
          chain: unknown[];
      }
    | {
          success: false;
          missing: [number, number] | null;
      };

type TransactionValidationResult =
    | {
          success: true;
      }
    | {
          success: false;
          message: string;
      };

export default interface IBlockchainChecker {
    validateBlockRange(
        chain: unknown[],
        blocks: unknown[]
    ): BlockRangeValidationResult;

    validateTransaction(
        chain: unknown[],
        tx: unknown
    ): TransactionValidationResult;
}
