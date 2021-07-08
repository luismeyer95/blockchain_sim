import IBlockchainOperator from "src/Interfaces/IBlockchainOperator";
import { z } from "zod";

export default interface IBlockchainDataFactory {
    getTransactionShapeValidator: () => z.ZodAny;
    getBlockShapeValidator: () => z.ZodAny;
    createChainOperatorInstance: () => IBlockchainOperator;

    getFactoryId: () => string;
}
