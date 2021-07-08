import IBlockchainChecker from "src/Interfaces/IBlockchainChecker";
import { z } from "zod";

export default interface IBlockchainDataFactory {
    getTransactionShapeValidator: () => z.ZodAny;
    getBlockShapeValidator: () => z.ZodAny;
    createChainCheckerInstance: () => IBlockchainChecker;

    getFactoryId: () => string;
}
