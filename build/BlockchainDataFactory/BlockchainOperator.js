"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainOperator = void 0;
var IBlock_1 = require("src/BlockchainDataFactory/IBlock");
var IAccountTransaction_1 = require("src/BlockchainDataFactory/IAccountTransaction");
var Encryption_1 = require("src/Encryption/Encryption");
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
        try {
            blocks.forEach(function (block) {
                _this.tryAddBlock(resultChain, block);
            });
        }
        catch (_a) {
            return { success: false, missing: null };
        }
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
    BlockchainOperator.prototype.validateTransaction = function (chain, tx) {
        var revChain = this.getReverseChain(chain);
        try {
            this.verifyTransaction(tx, revChain);
        }
        catch (err) {
            return {
                success: false,
                message: err.message,
            };
        }
        return { success: true };
    };
    BlockchainOperator.prototype.createAccountOperation = function (publicKey, operation, revChain) {
        var address = Encryption_1.serializeKey(publicKey);
        var result = this.retrieveLastAccountOperation(address, revChain);
        var last_ref = result ? result.ref : null;
        var updated_balance = result
            ? result.op.updated_balance + operation
            : operation;
        return {
            address: address,
            operation: operation,
            last_ref: last_ref,
            updated_balance: updated_balance,
        };
    };
    // verify sum(to[].amount) + fee against account funds
    BlockchainOperator.prototype.createTransaction = function (chain, info, privateKey) {
        var _this = this;
        var revChain = this.getReverseChain(chain);
        var destOperations = info.to.map(function (destOp) {
            return _this.createAccountOperation(destOp.address, destOp.amount, revChain);
        });
        var fromMovement = destOperations.reduce(function (acc, el) { return acc - el.operation; }, 0) -
            info.fee;
        var fromOperation = this.createAccountOperation(info.from.address, fromMovement, revChain);
        var txPayload = {
            from: fromOperation,
            to: destOperations,
            miner_fee: info.fee,
            timestamp: Date.now(),
        };
        var txPayloadBuffer = Buffer.from(JSON.stringify(txPayload));
        var tx = {
            header: {
                signature: Encryption_1.sign(txPayloadBuffer, privateKey).toString("base64"),
            },
            payload: txPayload,
        };
        this.verifyTransaction(tx, revChain);
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
        var blockReward = 10;
        var revChain = this.getReverseChain(chain);
        var to = this.createAccountOperation(keypair.publicKey, sumFees + blockReward, revChain);
        var payload = {
            timestamp: Date.now(),
            to: to,
        };
        var payloadBuf = Buffer.from(JSON.stringify(payload));
        var signature = Encryption_1.sign(payloadBuf, keypair.privateKey).toString("base64");
        return {
            header: {
                signature: signature,
            },
            payload: payload,
        };
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
        this.verifyBlockPayloadHash(block, 23);
        this.verifyIncludedPrevBlockHash(chain, block);
        this.verifyBlockCoinbaseSignature(block);
        this.verifyBlockTimestamps(chain, block);
        this.verifyNoDupeRefWithinBlock(block);
        this.verifyOperationRef(block.payload.coinbase.payload.to, revChain);
        this.verifyBlockTransactions(block, revChain);
        // TODO: REMOVE HARDCODED BLOCK REWARD!!
        this.verifyBlockFullRewardBalance(block, 10);
    };
    BlockchainOperator.prototype.verifyOperationRef = function (txOp, revChain) {
        if (txOp.last_ref === null)
            this.verifyNullLastRefOperation(txOp, revChain);
        else
            this.verifyNonNullLastRefOperation(txOp, revChain);
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
        if (prevBlock) {
            var blockCheck = prevBlock.payload.timestamp < block.payload.timestamp &&
                block.payload.timestamp < Date.now();
            var coinbaseTimestamp = block.payload.coinbase.payload.timestamp;
            var coinbaseCheck = prevBlock.payload.timestamp < coinbaseTimestamp &&
                coinbaseTimestamp < Date.now();
            if (!blockCheck || !coinbaseCheck)
                throw new Error("bad block timestamps");
        }
        throw new Error("error: did not check for block continuity");
    };
    BlockchainOperator.prototype.getPreviousBlock = function (chain, block) {
        var blockIndex = block.payload.index;
        if (blockIndex === 0 || chain.length < blockIndex)
            return null;
        return chain[blockIndex - 1];
    };
    BlockchainOperator.prototype.verifyBlockCoinbaseSignature = function (block) {
        var coinbaseSig = Buffer.from(block.payload.coinbase.header.signature, "base64");
        var publicKeyMiner = Encryption_1.deserializeKey(block.payload.coinbase.payload.to.address, "public");
        var coinbasePayload = Buffer.from(JSON.stringify(block.payload.coinbase.payload));
        if (!Encryption_1.verify(coinbasePayload, publicKeyMiner, coinbaseSig))
            throw new Error("bad block coinbase signature");
    };
    // throws
    BlockchainOperator.prototype.verifyLastRefNotAlreadyReferenced = function (publicKey, lastRef, revChain) {
        for (var _i = 0, revChain_1 = revChain; _i < revChain_1.length; _i++) {
            var block = revChain_1[_i];
            for (var _a = 0, _b = block.payload.txs; _a < _b.length; _a++) {
                var tx = _b[_a];
                this.verifyNoDupeLastRefInBlockchainTx(tx, publicKey, lastRef);
            }
        }
    };
    BlockchainOperator.prototype.verifyNoDupeLastRefInBlockchainTx = function (tx, publicKey, lastRef) {
        tx.payload.to.forEach(function (output) {
            if (output.address === publicKey && output.last_ref === lastRef)
                throw new Error("last_ref is already referenced");
        });
    };
    BlockchainOperator.prototype.getReverseChain = function (chain, stopIndex) {
        if (stopIndex === void 0) { stopIndex = chain.length; }
        return chain
            .slice()
            .filter(function (block) { return block.payload.index < stopIndex; })
            .reverse();
    };
    BlockchainOperator.prototype.retrieveLastAccountOperation = function (publicKey, revChain) {
        for (var _i = 0, revChain_2 = revChain; _i < revChain_2.length; _i++) {
            var block = revChain_2[_i];
            if (block.payload.coinbase.payload.to.address === publicKey)
                return {
                    op: block.payload.coinbase.payload.to,
                    ref: block.payload.coinbase.header.signature,
                };
            for (var _a = 0, _b = block.payload.txs; _a < _b.length; _a++) {
                var tx = _b[_a];
                if (tx.payload.from.address === publicKey)
                    return { op: tx.payload.from, ref: tx.header.signature };
                for (var _c = 0, _d = tx.payload.to; _c < _d.length; _c++) {
                    var output = _d[_c];
                    if (output.address === publicKey)
                        return { op: output, ref: tx.header.signature };
                }
            }
        }
        return null;
    };
    BlockchainOperator.prototype.verifyNoDupeRefWithinBlock = function (block) {
        var keyRefPairs = [
            block.payload.coinbase.payload.to.last_ref +
                block.payload.coinbase.payload.to.address,
        ];
        block.payload.txs.forEach(function (tx) {
            keyRefPairs.push(tx.payload.from.last_ref + tx.payload.from.address);
            var toPairs = tx.payload.to.map(function (op) { return op.last_ref + op.address; });
            keyRefPairs.push.apply(keyRefPairs, toPairs);
        });
        var keyRefPairSet = new Set(keyRefPairs);
        if (keyRefPairs.length !== keyRefPairSet.size)
            throw new Error("found dupe (last_ref, address) pair within block operations");
    };
    BlockchainOperator.prototype.verifyNoPriorTxOnAccount = function (publicKey, revChain) {
        for (var _i = 0, revChain_3 = revChain; _i < revChain_3.length; _i++) {
            var block = revChain_3[_i];
            if (block.payload.coinbase.payload.to.address === publicKey)
                throw new Error("found prior tx on account");
            for (var _a = 0, _b = block.payload.txs; _a < _b.length; _a++) {
                var tx = _b[_a];
                for (var _c = 0, _d = tx.payload.to; _c < _d.length; _c++) {
                    var output = _d[_c];
                    if (output.address === publicKey)
                        throw new Error("found prior tx on account");
                }
            }
        }
    };
    BlockchainOperator.prototype.verifyNullLastRefOperation = function (txOp, revChain) {
        this.verifyNoPriorTxOnAccount(txOp.address, revChain);
        if (txOp.operation !== txOp.updated_balance)
            throw new Error("bad first account tx balance");
    };
    BlockchainOperator.prototype.verifyNonNullLastRefOperation = function (txOp, revChain) {
        this.verifyLastRefNotAlreadyReferenced(txOp.address, txOp.last_ref, revChain);
        var result = this.retrieveLastAccountOperation(txOp.address, revChain);
        if (!result)
            throw new Error("operation ref is not null but no record of last operation");
        var lastOp = result.op, ref = result.ref;
        if (ref !== txOp.last_ref)
            throw new Error("bad last ref");
        if (lastOp.updated_balance + txOp.operation !== txOp.updated_balance)
            throw new Error("bad account balance update");
    };
    BlockchainOperator.prototype.verifyOperationSign = function (txOp, type) {
        if ((txOp.operation < 0 && type === "to") ||
            (txOp.operation > 0 && type === "from"))
            throw new Error("bad sign for tx operation field");
    };
    BlockchainOperator.prototype.verifyTransaction = function (tx, revChain) {
        var _this = this;
        if (tx.payload.from.last_ref === null)
            throw new Error("source account of tx has null last ref");
        this.verifyNonNullLastRefOperation(tx.payload.from, revChain);
        this.verifyOperationSign(tx.payload.from, "from");
        this.verifyTransactionSignature(tx);
        this.verifyUnicityAcrossDestinationAccountsOfTx(tx);
        this.verifyTransactionOperationsBalance(tx);
        this.verifyNoNegativeBalanceInTransaction(tx);
        tx.payload.to.forEach(function (txOp) {
            _this.verifyOperationSign(txOp, "to");
            if (txOp.last_ref === null) {
                _this.verifyNullLastRefOperation(txOp, revChain);
            }
            else {
                _this.verifyNonNullLastRefOperation(txOp, revChain);
            }
        });
    };
    BlockchainOperator.prototype.verifyTransactionSignature = function (tx) {
        var sig = Buffer.from(tx.header.signature, "base64");
        var fromKey = Encryption_1.deserializeKey(tx.payload.from.address, "public");
        var txPayload = Buffer.from(JSON.stringify(tx.payload));
        if (!Encryption_1.verify(txPayload, fromKey, sig))
            throw new Error("bad transaction signature");
    };
    BlockchainOperator.prototype.verifyUnicityAcrossDestinationAccountsOfTx = function (tx) {
        var addressArr = tx.payload.to.map(function (op) { return op.address; });
        var addressSet = new Set(addressArr);
        if (addressArr.length !== addressSet.size) {
            throw new Error("duplicate address found in tx output operations");
        }
    };
    BlockchainOperator.prototype.verifyTransactionOperationsBalance = function (tx) {
        var destBalance = tx.payload.to.reduce(function (acc, el) { return acc + el.operation; }, 0);
        var sourceBalance = tx.payload.from.operation;
        if (sourceBalance + destBalance + tx.payload.miner_fee !== 0)
            throw new Error("bad transaction balance");
    };
    BlockchainOperator.prototype.verifyNoNegativeBalanceInTransaction = function (tx) {
        var err = new Error("negative balance for transaction");
        tx.payload.to.forEach(function (op) {
            if (op.updated_balance < 0)
                throw err;
        });
        if (tx.payload.from.updated_balance < 0)
            throw err;
    };
    BlockchainOperator.prototype.verifyBlockTransactions = function (block, revChain) {
        for (var _i = 0, _a = block.payload.txs; _i < _a.length; _i++) {
            var tx = _a[_i];
            this.verifyTransaction(tx, revChain);
        }
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
