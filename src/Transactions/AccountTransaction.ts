import { z } from "zod";

interface IAccountOperation {
    // public key of account
    address: string;

    // positive/negative number added to the last balance of the account
    // representing its state change in the context of a tx
    operation: number;

    // base64 signature hash of the last tx referencing the account's balance
    last_ref: string | null;

    // newly computed balance of the account using last_ref's balance
    updated_balance: number;
}

// regular account movement transaction
// can be verified by stakeholders by applying verification of the signature
// using the source acccount's public key
interface IAccountTransaction {
    header: {
        // base64 string representation of the tx payload hash
        hash: string;

        // base64 string representation of the tx payload signed
        // with the source account private key
        signature: string;
    };

    // encapsulates signable props to make it easier to hash/sign
    payload: {
        // operation should be - for from and + for to
        // nodes validate that from.operation + sum(to[].operation) + miner_fee === 0
        // source account must have a last_ref!
        from: IAccountOperation;
        to: IAccountOperation[];
        miner_fee: number;

        // unix time
        // important: a transaction timestamp older than the last mined
        // block's timestamp should be considered invalid
        timestamp: string;
    };
}

interface ICoinbaseTransaction {
    header: {
        // base64 string representation of the coinbase payload hash
        hash: string;

        // base64 string representation of the tx payload signed
        // with the MINER's private key.
        signature: string;
    };

    payload: {
        // operation must be block reward + sum(fees) of containing block
        to: IAccountOperation;

        // unix time
        // important: a transaction timestamp older than the last mined block's timestamp
        // should be considered invalid
        timestamp: string;
    };
}

interface IBlock {
    header: {
        // base64 string representation of the block hash.
        // mining involves hashing the JSON.stringified payload
        // until a certain nonce makes the hash fulfill a complexity
        // requirement
        hash: string;
    };
    // encapsulates signable props to make it easier to hash/sign
    payload: {
        // block's index in the blockchain
        index: number;

        // unix time
        // important: a transaction timestamp older than the last mined block's timestamp
        // should be considered invalid
        timestamp: number;

        // the magic number that makes the block hash fulfill the complexity requirement
        nonce: number;

        // base64 string hash of the previous block
        // or null for genesis block
        previous_hash: string | null;

        // miner's reward
        coinbase: ICoinbaseTransaction;

        // array of account transactions
        txs: IAccountTransaction[];
    };
}

// BLOCKCHAIN GENESIS

// 1. first node spawns and starts mining with newly generated keys

// 2. other nodes join the network and start mining as well

// 3. each node competes in the process of trying to find a gold nonce
//    (fulfilling a certain complexity requirement)
//    for the hash of a block containing a single coinbase transaction
//    with the 'payload.to' field including their own account's public key

// 4. no broadcasted transactions because no coins yet, so miners only go
//    for the block reward and don't dynamically update their coinbase tx with tx fees

// 5. one node eventually finds the gold nonce for their block, signs it their private key
//    and starts broadcasting the block

// 6. receiving nodes try to validate the block

// block validation involves:
//      - validating the block hash proof with the correct complexity by hashing
//        the payload, checking leading zeros and checking against block.header.hash
//      - block.coinbase.payload really hashes to block.coinbase.header.hash
//      - block.payload.prev_hash === prevblock.header.hash
//      - checking (block.coinbase.header.signature, block.coinbase.payload.to.address)
//      - block.payload.index is an increment of the previous block's index
//      - if current block is not genesis, make sure that the following is true =>
//        prevblock.payload.timestamp < block.payload.timestamp < Date.now()
//      - same goes for prevblock.payload.coinbase.timestamp
//      - validate block.coinbase.payload.to, which involves:
//          - finding the tx referenced by to.last_ref in previous blocks
//          - if it exists and isn't referenced as last_ref by another tx, OK
//          - check this by iterating the blockchain backwards to find the hash and checking
//            for a dupe last_ref at the same time, rejecting if you find one
//          - if an unreferenced tx is found => good, then
//              - (MIGHT NOT BE NEEDED?) if unreftx is account tx:
//                validate unicity of addresses across the unreftx.payload.to
//              - to.updated_balance should be === to.operation + unreftx.payload.to[x].updated_balance
//      - validate account transactions(**) and compute sum(tx fees)
//      - validate that block.coinbase.payload.to.operation === block reward + sum(tx fees)

// account transaction validation involves:
//      - source account must have a last_ref!
//      - verify(tx.header.signature, tx.payload.from.address) with tx.payload as data
//      - validate that tx.payload hashes to tx.header.hash
//      - validate unicity of addresses across tx.payload.to array
//      - operation should be - for tx.payload.from and + for tx.payload.to
//      - validate that tx.payload.from.operation + sum(tx.payload.to[].operation) + miner_fee === 0

// REQUIREMENTS

// need a way to validate data shape for account transactions, blocks and blockchain
// need a way to serialize/deserialize each resource type
// need a way to retrieve a local copy of the blockchain from the network
// need a way to maintain/update local blockchain as to reflect consensus
// where do all blockchain mutations originate?
//      - nodes mine blocks and broadcast them for validation
// a node does not need to mine, but it must maintain consensus with the network
// to accurately represent the state of the ledger and perform operations on it

// REACHING CONSENSUS
//      1. on node network initialization, broadcast a LAST_BLOCK request
//      2. ask the full chain to any node that responded with the
//         most recurrent block hash using a GET_FULL_CHAIN request
//      3. store the full chain locally

// MAINTAINING CONSENSUS
//      1. listen for broadcasted blocks
//      2. on block reception:
//         if its index is superior to my latest block:
//              - request the blocks i'm missing with a GET_PARTIAL_CHAIN
//                ex: my latest block is #4, i received #7, ask for #5 and #6
//              - validate + append to local chain if valid
//         else if the received block clashes with a block of my local chain BUT is a
//         valid append to the block before it
//              - mark received block # as potential fork point
//              - subsequent GET_PARTIAL_CHAIN requests to longer chained
//                nodes should ask for the blocks from the fork point onward
//                for extended validation
//              - the first partial chain request to result in local validation of
//                the block # FOLLOWING the fork point is the consensus, save locally
//                and reset back to normal state

const accountTransactionParser = (data: unknown) => {};
const accountTransactionValidator = (data: unknown, blockchain: any) => {};
