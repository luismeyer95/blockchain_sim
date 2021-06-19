import { KeyObject, KeyPairKeyObjectResult } from "crypto";
import { genKeyPair, serializeKey } from "../Encryption/Encryption";
import { dig } from "../utils";
// import _, { has, initial, last } from "lodash";

import { Block } from "../Block/Block";
import {
    SignedTransaction,
    InitialTransaction,
    Input,
    Output,
} from "../Transactions/Transactions";

import INodeNet from "src/NodeNet/INodeNet";
import INodeProtocol from "src/NodeProtocol/INodeProtocol";
import NodeProtocol from "src/NodeProtocol/NodeProtocol";
import SwarmNet from "src/NodeNet/SwarmNet";
import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";
import { TwoWayMap } from "src/utils";

export class Node {
    public blockchain: Block[];
    public pendingTransactions: Array<SignedTransaction | InitialTransaction>;
    // public keypair: KeyPairKeyObjectResult;

    public protocol: INodeProtocol;
    public net: INodeNet;
    private log: ILogger;
    private ctorDispatcher: TwoWayMap<any, any>;

    constructor(
        blockchain?: Block[],
        protocol: INodeProtocol = new NodeProtocol(),
        net: INodeNet = new SwarmNet(),
        logger: ILogger = log
    ) {
        this.blockchain = blockchain ?? [];
        this.pendingTransactions = [];
        this.protocol = protocol;
        this.net = net;
        this.log = logger;
        this.ctorDispatcher = new TwoWayMap<any, (...args: any[]) => any>(
            [InitialTransaction, this.receiveTransaction.bind(this)],
            [SignedTransaction, this.receiveTransaction.bind(this)],
            [Block, this.receiveBlock.bind(this)]
        );
        this.hookToNetwork();
    }

    private hookToNetwork() {
        this.net.on("payload", (payload: unknown) => {
            const resource = this.protocol.interpretMessage(payload);
            if (!resource) {
                this.log("[received bad protocol payload, ignored]\n");
                return;
            }
            const resourceHandler = this.ctorDispatcher.getValue(
                resource.constructor
            );
            resourceHandler(resource);
        });
    }

    private receiveTransaction(tx: InitialTransaction | SignedTransaction) {
        try {
            this.log("[collecting received tx]\n");
            this.collectTransaction(tx);
        } catch (err) {
            this.log("[received tx is invalid, ignored]\n");
        }
    }

    private receiveBlock(block: Block) {
        // to implement
    }

    createInitialTransaction(keypair: KeyPairKeyObjectResult, amount: number) {
        const initTx = new InitialTransaction({
            output: { to: keypair.publicKey, amount, balance: amount },
            timestamp: Date.now(),
        });
        this.collectTransaction(initTx);
        // broadcast tx here
        const message = this.protocol.createMessage(initTx);
        this.net.broadcast(message);
    }

    createSignedTransaction(tx: SignedTransaction, privateKey: KeyObject) {
        const lastOutput = this.findLastTransactionOutput(tx.input.from);
        if (!lastOutput) {
            throw new Error(
                "transaction error: missing last transaction output"
            );
        }
        const txProcessed: SignedTransaction = tx;
        const findLTXO = this.findLastTransactionOutput.bind(this);
        txProcessed.outputs = txProcessed.outputs.map((output) => {
            const ltxo: number = findLTXO(output.to)?.balance ?? 0;
            return {
                to: output.to,
                amount: output.amount,
                balance: output.amount + ltxo,
            };
        });
        const remaining = lastOutput.balance! - tx.getTotalAmount();
        txProcessed.outputs.push({
            to: tx.input.from,
            amount: remaining,
            balance: remaining,
        });
        txProcessed.sign(privateKey);
        this.collectTransaction(txProcessed);
        // broadcast tx here
        const message = this.protocol.createMessage(txProcessed);
        this.net.broadcast(message);
    }

    collectTransaction(tx: InitialTransaction | SignedTransaction) {
        this.validateTransaction(tx);
        this.pendingTransactions.push(tx);
        this.pendingTransactions.sort((a, b) => b.timestamp - a.timestamp);
    }

    validateTransaction(tx: InitialTransaction | SignedTransaction) {
        if (tx instanceof SignedTransaction) this.validateTransactionData(tx);
        this.validateTransactionAgainstBlockchain(tx);
        this.validateTxAddressUnicityInPendingTxs(tx);
    }

    validateTxAddressUnicityInPendingTxs(
        tx: SignedTransaction | InitialTransaction
    ): void {
        const err: Error = new Error(
            "transaction validation error:" +
                "address reference found in pending txs"
        );
        if (tx instanceof SignedTransaction) {
            this.pendingTransactions.forEach((ptx) => {
                if (ptx.containsAddress(tx.input.from)) throw err;
                tx.outputs.forEach((output) => {
                    if (ptx.containsAddress(output.to)) throw err;
                });
            });
        } else {
            this.pendingTransactions.forEach((ptx) => {
                if (ptx.containsAddress(tx.output.to)) throw err;
            });
        }
    }

    validateTransactionAgainstBlockchain(
        tx: SignedTransaction | InitialTransaction
    ): void {
        if (tx instanceof SignedTransaction) {
            const lastOutput = this.findLastTransactionOutput(tx.input.from);
            if (lastOutput && lastOutput.balance) {
                if (tx.getTotalAmount() > lastOutput.balance)
                    throw new Error(
                        "transaction error: insufficient account funds"
                    );
                if (tx.getTotalAmount() < lastOutput.balance)
                    throw new Error("transaction error: unspent input");
            } else {
                throw new Error("transaction error: no funds on this account");
            }
        } else {
            const lastOutput = this.findLastTransactionOutput(tx.output.to);
            if (lastOutput)
                throw new Error(
                    "transaction error: cannot create initial transaction on funded account"
                );
        }
    }

    validateTransactionData(tx: SignedTransaction): void {
        if (!tx.isValid())
            throw new Error(
                "transaction creation error: invalid transaction data"
            );
    }

    findLastTransactionOutput(publicKey: KeyObject): Output<KeyObject> | null {
        if (this.blockchain.length === 0) return null;
        const output: Output<KeyObject> | undefined = dig(
            this.blockchain,
            (block: Block) =>
                dig(
                    block.transactions,
                    (tx: InitialTransaction | SignedTransaction) => {
                        if (tx instanceof SignedTransaction) {
                            return dig(tx.outputs, (output) => {
                                if (
                                    serializeKey(output.to) ===
                                    serializeKey(publicKey)
                                )
                                    return output;
                            });
                        } else {
                            return serializeKey(tx.output.to) ===
                                serializeKey(publicKey)
                                ? tx.output
                                : null;
                        }
                    }
                )
        );
        return output ?? null;
    }

    mineBlock() {
        if (this.pendingTransactions.length === 0) return;
        let block = new Block();
        this.pendingTransactions.sort((a, b) => b.timestamp - a.timestamp);
        block.transactions.unshift(...this.pendingTransactions);
        this.pendingTransactions = [];
        this.blockchain.unshift(block);
    }

    printBlockchain() {
        console.log(
            JSON.stringify(
                this.blockchain.slice().map((block) => {
                    block.transactions = block.transactions.map((tx) =>
                        JSON.parse(tx.serialize())
                    );
                    return block;
                }),
                null,
                2
            )
        );
    }
}
