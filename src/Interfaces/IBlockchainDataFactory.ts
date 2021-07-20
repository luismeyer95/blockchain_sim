import { KeyPairKeyObjectResult } from "crypto";
import { IBlockchainOperator } from "src/Interfaces/IBlockchainOperator";
import { z } from "zod";
import IBlockchainMiner from "./IBlockchainMiner";
import IBlockchainState from "./IBlockchainState";
import IBlockchainWallet from "./IBlockchainWallet";

export default interface IBlockchainDataFactory {
    getTransactionShapeValidator: () => z.ZodAny;
    getBlockShapeValidator: () => z.ZodAny;

    createChainOperatorInstance: () => IBlockchainOperator;
    createStateInstance(): IBlockchainState;

    createMinerInstance(
        keypair: KeyPairKeyObjectResult,
        state: IBlockchainState
    ): IBlockchainMiner;

    createWalletInstance(
        keypair: KeyPairKeyObjectResult,
        state: IBlockchainState
    ): IBlockchainWallet;
}
