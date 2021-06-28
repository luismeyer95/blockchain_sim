import INodeProtocol from "./INodeProtocol";
import { BlockType, BlockCtor, Block, BlockValidator, IBlock } from "./IBlock";
import { z } from "zod";
import {
    AccountTransactionCtor,
    AccountTransaction,
} from "./IAccountTransaction";

export interface IBlockchain {
    getLastBlockIndex: () => number;
    getBlockRange: (range: [number, number]) => IBlock[];
    submitBlockRange: (blocks: IBlock[]) => boolean;

    getBlockCtor: () => BlockCtor;
    getTransactionCtor: () => AccountTransactionCtor;
}
