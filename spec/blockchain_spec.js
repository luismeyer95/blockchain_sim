"use strict";
// REQUIREMENTS
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
//          - check this by iterating the blockchain backwards to find the tx hash and checking
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
