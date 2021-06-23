// REQUIREMENTS

// need a way to retrieve a local copy of the blockchain from the network
// need a way to maintain/update local blockchain as to reflect consensus
// need a way to validate data shape for resources (tx, block, blockchain)
// need a way to serialize/deserialize each resource type
// where do all blockchain mutations originate?
//      - nodes mine blocks and broadcast them for validation
// a node does not need to mine, but it must maintain consensus with the
// network to accurately represent the real-time state of the ledger and
// perform operations on it

// REACHING/MAINTAINING CONSENSUS
//      1. listen for broadcasted blocks
//      2. on block reception:
//         if its index is superior to my latest block:
//              - request the blocks I'm missing with a REQUEST_BLOCK_RANGE
//                ex: my latest block is #4, i received #7, ask for #5 and #6
//              - validate + append to local chain if valid
//         else if the received block clashes with a block of my local chain BUT is a
//         valid append to the block before it
//              - mark received block # as potential fork point
//              - subsequent REQUEST_BLOCK_RANGE requests to longer chained
//                nodes should ask for the blocks from the fork point onward
//                for extended validation
//              - the first partial chain request to result in local validation of
//                the block # FOLLOWING the fork point is the consensus, save locally
//                and reset back to normal state

// NODE

// The node owns an abstract reference to the blockchain object and is responsible
// for maintaining blockchain state by interfacing with both the protocol layer and
// the blockchain store. The node owns an instance of a class that implements
// the protocol interface. It can listen to broadcast events and call its functions
// to request/broadcast data, passing a callback handling the response if needed.
// The data received inside the callback should be a standard data type (string)
// representing the raw data payload that will then be passed to the blockchain store
// instance for parsing, validation and processing.

// The node is also the message originator. Following the state of its local blockchain,
// communication history or transaction queue, a node will make decisions and initiate
// requests/broadcasts.

// BLOCKCHAIN STORE

// This object receives resource submissions from the node and attempts to keep
// a record of the true state of the blockchain. It owns the actual blockchain
// data structure and has knowledge of the data shape for every resource.

// The blockchain store should provide the node with information on the stored chain
// (or on received resources) that the node itself cannot retrieve (no knowledge of
// data shape) in order to guide consensus decisions and handle requests (get a
// specific block, block range, or the full chain as serialized data)

// Block range validation should provide detailed information on whether:
//  - block range is a valid append to the latest block
//  - block range is a valid append to another block (fork)
//  - block range is not a valid append to the block that precedes
//    in my local chain
//  - incomplete information: no knowledge of the preceding block
//    of block range

// After block range validation, those can be submitted to the store for update.
// if the chain is valid, this action mutates the chain and overwrites blocks at
// the corresponding indexes

// Transaction validation means the transaction is an acceptable inclusion into
// the next block to be mined according to the local blockchain, and can therefore
// be stored inside a miner's pending transactions.

// RESOURCE PARSERS/VALIDATORS

// The validators will perform runtime type checking on protocol payloads in order
// to map them to static types. If no validator returns success, data is considered
// malformed and a 'bad data' protocol response is sent back to the protocol layer
// by the node (maybe through a specific status code/enum mapping enforced by the
// protocol interface?)

// PROTOCOL

// A blockchain protocol should allow:
// 1. Reaching and maintaining consensus
// 2. Sharing of local chain state to drive consensus

// A possible protocol data/action mapping could be:
//  - REQUEST_BLOCK_RANGE: request a block range from the chain
//  - BLOCK: share a local append to my chain, or relay
//    received/validated/appended block
//  - TX: share a locally created transaction, or relay a
//    received/validated tx

// The protocol instance listens for raw data events on the network layer,
// checks messages for protocol-specific events and fires associated callbacks
// provided to event listeners by the node (ex: request(), onRequest(), onResponse(),
// onBlock(), onTransaction()). onRequest could take a callback that has a 'details'
// parameter detailing the request type and a 'respond' callback taking a response status
// and raw payload

// The node is given a protocol instance on instantiation. The protocol does NOT NEED
// to know about the payload data shape. It simply ensures the consistent formatting
// of protocol request/response HEADERS and the proper handling of message forwarding
// that depends on protocol layer information (such as a status field in a response).
// Note that whether the actions incur a broadcast or a single peer request is up to
// implementation, as the protocol can interact with the network layer API to use either.

// An implementation of this component interface benefits from flexibility in the means of
// exchange between nodes. Since the protocol layer directly interacts with the network layer,
// it makes it possible to implement an internal sub-protocol, with its own request/response
// cycle (ex: initial public key provision before exchange of encrypted data)

// NETWORK

// We can derive network requirements from what we've covered so far. A node should be
// able to broadcast data to as many peers as possible or engage in a request/response
// cycle with a chosen peer. Since no specific way of managing peers is enforced by the
// interface, topology can be handled in any way. However, broadcasted data should not
// loop back to a node. Keeping an internal message cache is one way of getting around
// loopback relaying.

// PEER DISCOVERY

// This component's sole task is to find other peers on the network and forward
// the communication sockets to the network layer. TCP hole punching, DNS seeds,
// local multicast... etc

// RESOURCES

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

// 5. one node eventually finds the gold nonce for their block, signs it w/ their private key
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
