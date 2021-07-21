"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainOperator = void 0;
var IBlock_1 = require("src/BlockchainDataFactory/IBlock");
var IAccountTransaction_1 = require("src/BlockchainDataFactory/IAccountTransaction");
var Encryption_1 = require("src/Encryption/Encryption");
var lodash_1 = __importDefault(require("lodash"));
var BlockchainOperator = /** @class */ (function () {
    function BlockchainOperator() {
    }
    BlockchainOperator.prototype.validateBlockRange = function (chain, blocks) {
        var _this = this;
        if (blocks.length === 0)
            throw new Error("empty block array submission");
        var missingRange = this.getMissingRange(chain, blocks[0]);
        if (missingRange)
            return { success: false, missing: missingRange };
        var resultChain = chain.filter(function (block) { return block.payload.index < blocks[0].payload.index; });
        // try {
        blocks.forEach(function (block) {
            _this.tryAddBlock(resultChain, block);
        });
        // } catch {
        // return { success: false, missing: null };
        // }
        return {
            success: true,
            chain: resultChain,
        };
    };
    BlockchainOperator.prototype.getTransactionShapeValidator = function () {
        return IAccountTransaction_1.AccountTransactionValidator;
    };
    BlockchainOperator.prototype.getBlockShapeValidator = function () {
        return IBlock_1.BlockValidator;
    };
    BlockchainOperator.prototype.validateTransaction = function (chain, tx, txPool) {
        var revChain = this.getReverseChain(chain);
        try {
            this.verifyTransaction(tx, revChain, txPool);
        }
        catch (err) {
            return {
                success: false,
                message: err.message,
            };
        }
        return { success: true };
    };
    BlockchainOperator.prototype.createAccountOperation = function (publicKey, operation, revChain, txPool) {
        var address = Encryption_1.serializeKey(publicKey);
        var res = this.retrieveLastAccountOperationInTxPool(address, txPool);
        if (res) {
            return {
                address: address,
                operation: operation,
                op_nonce: res.op.op_nonce + 1,
                updated_balance: res.op.updated_balance + operation,
            };
        }
        var result = this.retrieveLastAccountOperation(address, revChain);
        if (result) {
            return {
                address: address,
                operation: operation,
                op_nonce: result.op_nonce + 1,
                updated_balance: result.updated_balance + operation,
            };
        }
        return {
            address: address,
            operation: operation,
            op_nonce: 0,
            updated_balance: operation,
        };
    };
    // verify sum(to[].amount) + fee against account funds
    BlockchainOperator.prototype.createTransaction = function (info, privateKey, chain, txPool) {
        var revChain = this.getReverseChain(chain);
        var destOperation = this.createAccountOperation(info.to, info.amount, revChain, txPool);
        var fromMovement = -info.amount - info.fee;
        var fromOperation = this.createAccountOperation(info.from, fromMovement, revChain, txPool);
        var txPayload = {
            from: fromOperation,
            to: destOperation,
            miner_fee: info.fee,
        };
        var txPayloadBuffer = Buffer.from(JSON.stringify(txPayload));
        var tx = {
            header: {
                signature: Encryption_1.sign(txPayloadBuffer, privateKey).toString("base64"),
            },
            payload: txPayload,
        };
        // this.verifyTransaction(tx, revChain, txPool);
        // console.log(JSON.stringify(tx, null, 4));
        // process.exit(0);
        return tx;
    };
    BlockchainOperator.prototype.getLastBlock = function (chain) {
        if (chain.length) {
            return chain[chain.length - 1];
        }
        return null;
    };
    BlockchainOperator.prototype.createCoinbaseTransaction = function (keypair, txs, chain) {
        var sumFees = txs.reduce(function (acc, el) {
            return acc + el.payload.miner_fee;
        }, 0);
        // TODO: remove hardcoded!!
        var blockReward = 10;
        var revChain = this.getReverseChain(chain);
        var to = this.createAccountOperation(keypair.publicKey, sumFees + blockReward, revChain, txs);
        var payload = {
            to: to,
            timestamp: Date.now(),
        };
        var payloadBuf = Buffer.from(JSON.stringify(payload));
        var signatureBuf = Encryption_1.sign(payloadBuf, keypair.privateKey);
        var signature = signatureBuf.toString("base64");
        var coinbase = {
            header: {
                signature: signature,
            },
            payload: payload,
        };
        return coinbase;
    };
    BlockchainOperator.prototype.createBlockTemplate = function (keypair, txs, chain) {
        var coinbase = this.createCoinbaseTransaction(keypair, txs, chain);
        var lastBlock = this.getLastBlock(chain);
        var index = 0;
        var previous_hash = "";
        if (lastBlock) {
            index = lastBlock.payload.index + 1;
            previous_hash = lastBlock.header.hash;
        }
        else {
            index = 0;
            previous_hash = null;
        }
        return {
            header: {
                hash: "",
            },
            payload: {
                timestamp: Date.now(),
                nonce: 0,
                index: index,
                previous_hash: previous_hash,
                coinbase: coinbase,
                txs: txs,
            },
        };
    };
    BlockchainOperator.prototype.isAppendable = function (chain, block) {
        var rangeFirstIndex = block.payload.index;
        if (chain.length === 0)
            return block.payload.index === 0;
        return chain[chain.length - 1].payload.index + 1 === rangeFirstIndex;
    };
    BlockchainOperator.prototype.getMissingRange = function (chain, block) {
        if (!this.isAppendable(chain, block)) {
            var start = chain.length
                ? chain[chain.length - 1].payload.index
                : 0;
            return [start, block.payload.index + 1];
        }
        return null;
    };
    BlockchainOperator.prototype.tryAddBlock = function (chain, block) {
        this.verifyBlock(chain, block);
        chain[block.payload.index] = block;
    };
    BlockchainOperator.prototype.verifyBlock = function (chain, block) {
        var revChain = this.getReverseChain(chain, block.payload.index);
        // TODO: REMOVE HARDCODED COMPLEXITY!!
        this.verifyBlockPayloadHash(block, 19);
        this.verifyIncludedPrevBlockHash(chain, block);
        this.verifyBlockCoinbaseSignature(block);
        this.verifyBlockTimestamps(chain, block);
        // this.verifyNoDupeRefWithinBlock(block);
        this.verifyOperationAgainstPoolOrChain(block.payload.coinbase.payload.to, revChain, block.payload.txs);
        this.verifyBlockTransactions(block, revChain);
        // TODO: REMOVE HARDCODED BLOCK REWARD!!
        this.verifyBlockFullRewardBalance(block, 10);
    };
    BlockchainOperator.prototype.verifyOperation = function (txOp, revChain) {
        if (txOp.op_nonce === 0)
            this.verifyZeroNonceOperation(txOp, revChain);
        else
            this.verifyNonZeroNonceOperation(txOp, revChain);
    };
    BlockchainOperator.prototype.verifyZeroNonceOperation = function (txOp, revChain) {
        if (txOp.operation !== txOp.updated_balance)
            throw new Error("bad first account tx balance");
        var lastOp = this.retrieveLastAccountOperation(txOp.address, revChain);
        if (lastOp)
            throw new Error("found prior operation on account");
    };
    BlockchainOperator.prototype.verifyNonZeroNonceOperation = function (txOp, revChain) {
        var lastOp = this.retrieveLastAccountOperation(txOp.address, revChain);
        if (!lastOp)
            throw new Error("operation nonce is not null but no record of last operation");
        this.verifyOperationCongruence(lastOp, txOp);
    };
    BlockchainOperator.prototype.retrieveLastAccountOperation = function (publicKey, revChain) {
        for (var _i = 0, revChain_1 = revChain; _i < revChain_1.length; _i++) {
            var block = revChain_1[_i];
            if (block.payload.coinbase.payload.to.address === publicKey)
                return block.payload.coinbase.payload.to;
            for (var _a = 0, _b = block.payload.txs; _a < _b.length; _a++) {
                var tx = _b[_a];
                if (tx.payload.from.address === publicKey)
                    return tx.payload.from;
                if (tx.payload.to.address === publicKey)
                    return tx.payload.to;
            }
        }
        return null;
    };
    BlockchainOperator.prototype.verifyBlockPayloadHash = function (block, complexity) {
        var payloadString = JSON.stringify(block.payload);
        var hashed = Encryption_1.hash(Buffer.from(payloadString));
        var base64hash = hashed.digest("base64");
        var isGold = Encryption_1.hashSatisfiesComplexity(payloadString, complexity);
        if (!isGold.success || base64hash !== block.header.hash)
            throw new Error("bad block hash");
    };
    BlockchainOperator.prototype.verifyIncludedPrevBlockHash = function (chain, block) {
        var prevHash = block.payload.previous_hash;
        var blockIndex = block.payload.index;
        if (blockIndex === 0) {
            if (prevHash !== null)
                throw new Error("bad previous block hash");
        }
        else {
            var prevBlock = this.getPreviousBlock(chain, block);
            if (prevBlock) {
                var localPrevHash = prevBlock.header.hash;
                if (prevHash !== localPrevHash)
                    throw new Error("bad previous block hash");
            }
            else {
                throw new Error("error: did not check for block continuity");
                // should NOT happen
            }
        }
    };
    BlockchainOperator.prototype.verifyBlockTimestamps = function (chain, block) {
        var prevBlock = this.getPreviousBlock(chain, block);
        var now = Date.now();
        var blockStamp = block.payload.timestamp;
        var coinbaseStamp = block.payload.coinbase.payload.timestamp;
        var blockCheck, coinbaseCheck;
        if (prevBlock) {
            var prevBlockStamp = prevBlock.payload.timestamp;
            blockCheck = prevBlockStamp < blockStamp && blockStamp < now;
            coinbaseCheck =
                prevBlockStamp < coinbaseStamp && coinbaseStamp < now;
        }
        else {
            blockCheck = blockStamp < now;
            coinbaseCheck = coinbaseStamp < now;
        }
        if (!blockCheck || !coinbaseCheck)
            throw new Error("bad block timestamps");
    };
    BlockchainOperator.prototype.getPreviousBlock = function (chain, block) {
        var blockIndex = block.payload.index;
        if (blockIndex === 0 || chain.length < blockIndex)
            return null;
        return chain[blockIndex - 1];
    };
    BlockchainOperator.prototype.verifyBlockCoinbaseSignature = function (block) {
        var coinbase = block.payload.coinbase;
        var coinbaseSig = Buffer.from(coinbase.header.signature, "base64");
        var publicKeyMiner = Encryption_1.deserializeKey(coinbase.payload.to.address, "public");
        var coinbasePayload = Buffer.from(JSON.stringify(coinbase.payload));
        if (!Encryption_1.verify(coinbasePayload, publicKeyMiner, coinbaseSig))
            throw new Error("bad block coinbase signature");
    };
    BlockchainOperator.prototype.getReverseChain = function (chain, stopIndex) {
        if (stopIndex === void 0) { stopIndex = chain.length; }
        return chain
            .slice()
            .filter(function (block) { return block.payload.index < stopIndex; })
            .reverse();
    };
    // private verifyNoDupeRefWithinBlock(block: BlockType) {
    //     const keyRefPairs = [
    //         block.payload.coinbase.payload.to.last_ref +
    //             block.payload.coinbase.payload.to.address,
    //     ];
    //     block.payload.txs.forEach((tx) => {
    //         keyRefPairs.push(
    //             tx.payload.from.last_ref + tx.payload.from.address
    //         );
    //         const toPairs = tx.payload.to.map((op) => op.last_ref + op.address);
    //         keyRefPairs.push(...toPairs);
    //     });
    //     const keyRefPairSet = new Set(keyRefPairs);
    //     if (keyRefPairs.length !== keyRefPairSet.size)
    //         throw new Error(
    //             "found dupe (last_ref, address) pair within block operations"
    //         );
    // }
    BlockchainOperator.prototype.verifyOperationSign = function (txOp, type) {
        if ((txOp.operation < 0 && type === "to") ||
            (txOp.operation > 0 && type === "from"))
            throw new Error("bad sign for tx operation field");
    };
    BlockchainOperator.prototype.verifyTransaction = function (tx, revChain, txPool) {
        this.verifyTransactionAgainstPoolOrChain(tx, txPool, revChain);
    };
    // private verifyTransactionAgainstBlockchain(
    //     tx: AccountTransactionType,
    //     revChain: BlockType[]
    // ) {
    //     // if (tx.payload.from.op_nonce === 0)
    //     //     throw new Error("source account of tx has null last ref");
    //     this.verifyOperation(tx.payload.from, revChain);
    //     this.verifyOperation(tx.payload.to, revChain);
    //     this.verifyOperationSign(tx.payload.from, "from");
    //     this.verifyTransactionSignature(tx);
    //     this.verifyTransactionOperationsBalance(tx);
    //     this.verifyNoNegativeBalanceInTransaction(tx);
    //     this.verifyOperationSign(tx.payload.to, "to");
    // }
    // private verifyTransactionAgainstTrustedPool(
    //     tx: AccountTransactionType,
    //     txPool: AccountTransactionType[]
    // ) {
    //     this.verifyOperationAgainstTrustedPool(tx.payload.from, txPool);
    //     this.verifyOperationAgainstTrustedPool(tx.payload.to, txPool);
    // }
    // private verifyOperationAgainstTrustedPool(
    //     op: AccountOperationType,
    //     txPool: AccountTransactionType[]
    // ) {
    //     const res = this.retrieveLastAccountOperationInTxPool(
    //         op.address,
    //         txPool
    //     );
    //     if (res) {
    //         const { op: lastOp } = res;
    //         this.verifyOperationCongruence(lastOp, op);
    //     }
    // }
    BlockchainOperator.prototype.verifyOperationCongruence = function (prev, cur) {
        if (prev.address != cur.address)
            throw new Error("different address");
        if (prev.op_nonce + 1 !== cur.op_nonce)
            throw new Error("bad op nonce: " + prev.op_nonce + " + 1 !== " + cur.op_nonce);
        if (prev.updated_balance + cur.operation !== cur.updated_balance)
            throw new Error("bad updated balance");
    };
    BlockchainOperator.prototype.verifyTransactionPoolAgainstBlockchain = function (txPool, revChain) {
        var _this = this;
        lodash_1.default.forEachRight(txPool, function (tx, index) {
            _this.verifyTransactionAgainstPoolOrChain(tx, txPool.slice(0, index), revChain);
        });
    };
    BlockchainOperator.prototype.verifyTransactionAgainstPoolOrChain = function (tx, txPool, revChain) {
        this.verifyOperationSign(tx.payload.from, "from");
        this.verifyOperationSign(tx.payload.to, "to");
        this.verifyTransactionOperationsBalance(tx);
        this.verifyNoNegativeBalanceInTransaction(tx);
        this.verifyOperationAgainstPoolOrChain(tx.payload.from, revChain, txPool);
        this.verifyOperationAgainstPoolOrChain(tx.payload.to, revChain, txPool);
        this.verifyTransactionSignature(tx);
    };
    BlockchainOperator.prototype.verifyOperationAgainstPoolOrChain = function (op, revChain, txPool) {
        var res = this.retrieveLastAccountOperationInTxPool(op.address, txPool);
        if (res) {
            this.verifyOperationCongruence(res.op, op);
        }
        else {
            this.verifyOperation(op, revChain);
        }
    };
    BlockchainOperator.prototype.retrieveLastAccountOperationInTxPool = function (publicKey, txs) {
        // reverse iteration
        var length = txs.length;
        for (var i = length - 1; i >= 0; --i) {
            var tx = txs[i];
            if (tx.payload.from.address === publicKey)
                return { index: i, op: tx.payload.from };
            if (tx.payload.to.address === publicKey)
                return { index: i, op: tx.payload.to };
        }
        return null;
    };
    BlockchainOperator.prototype.verifyTransactionSignature = function (tx) {
        // console.log("CHECKING SIG", tx.header.signature);
        var sig = Buffer.from(tx.header.signature, "base64");
        var fromKey = Encryption_1.deserializeKey(tx.payload.from.address, "public");
        var txPayload = Buffer.from(JSON.stringify(tx.payload));
        if (!Encryption_1.verify(txPayload, fromKey, sig))
            throw new Error("bad transaction signature");
    };
    BlockchainOperator.prototype.verifyTransactionOperationsBalance = function (tx) {
        var destBalance = tx.payload.to.operation;
        var sourceBalance = tx.payload.from.operation;
        var balance = sourceBalance + destBalance + tx.payload.miner_fee;
        if (balance !== 0)
            throw new Error("bad transaction balance: " + balance + " !== 0");
    };
    BlockchainOperator.prototype.verifyNoNegativeBalanceInTransaction = function (tx) {
        var err = new Error("negative balance for transaction");
        if (tx.payload.to.updated_balance < 0)
            throw err;
        if (tx.payload.from.updated_balance < 0)
            throw err;
    };
    BlockchainOperator.prototype.verifyBlockTransactions = function (block, revChain) {
        // for (const tx of block.payload.txs) {
        //     this.verifyTransaction(tx, revChain);
        // }
        this.verifyTransactionPoolAgainstBlockchain(block.payload.txs, revChain);
    };
    BlockchainOperator.prototype.verifyBlockFullRewardBalance = function (block, setBlockReward) {
        var coinbaseOperation = block.payload.coinbase.payload.to.operation;
        var sumFees = block.payload.txs.reduce(function (acc, el) { return acc + el.payload.miner_fee; }, 0);
        if (coinbaseOperation !== sumFees + setBlockReward)
            throw new Error("bad block full reward balance");
    };
    return BlockchainOperator;
}());
exports.BlockchainOperator = BlockchainOperator;
//# sourceMappingURL=BlockchainOperator.js.map