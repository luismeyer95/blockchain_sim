import { KeyPairKeyObjectResult } from "crypto";
import { KeyObject } from "crypto";
import { BlockchainOperator } from "src/BlockchainDataFactory/BlockchainOperator";
import { AccountTransactionType } from "src/BlockchainDataFactory/IAccountTransaction";
import { TransactionInfo } from "src/Interfaces/IBlockchainOperator";
import IBlockchainWallet from "src/Interfaces/IBlockchainWallet";
import { EventEmitter } from "stream";
import { BlockchainState } from "./BlockchainState";

export default class BlockchainWallet implements IBlockchainWallet {
    private operator: BlockchainOperator = new BlockchainOperator();
    private events: EventEmitter = new EventEmitter();
    private keypair: KeyPairKeyObjectResult;
    private state: BlockchainState;

    constructor(keypair: KeyPairKeyObjectResult, state: BlockchainState) {
        this.keypair = keypair;
        this.state = state;
    }

    submitTransaction(dest: KeyObject, amount: number, fee: number): void {
        const txinfo: TransactionInfo = {
            from: this.keypair.publicKey,
            to: dest,
            amount,
            fee,
        };
        const tx = this.operator.createTransaction(
            txinfo,
            this.keypair.privateKey,
            this.state.getChainState(),
            this.state.getTxPoolState()
        );
        this.events.emit("tx", tx);
    }

    onTransaction(fn: (tx: AccountTransactionType) => void): void {
        this.events.on("tx", fn);
    }
}
