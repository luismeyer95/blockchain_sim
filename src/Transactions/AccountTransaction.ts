import { z } from "zod";

// regular account movement transaction
// can be verified by stakeholders by applying verification of the signature
// using the source acccount's public key
interface IAccountTransaction {
    // public keys of source and destination accounts as base64 strings
    from: string;
    to: string;

    // self-explanatory
    amount: number;

    // unix time
    // important: a transaction timestamp older than the last mined
    // block's timestamp should be considered invalid
    timestamp: string;

    // signed hash of the result of
    // JSON.stringify({from, to, amount, timestamp}) using the source
    // account's private key (as a base64 string)
    signature: string;
}

interface ICoinbaseTransaction {
    // public key of miner's account
    to: string;
    // miner reward, will be set to 1
    amount: number;

    // unix time
    // important: a transaction timestamp older than the last mined block's timestamp
    // should be considered invalid
    timestamp: string;

    // base64 signature hash of the last tx referencing the account's balance
    // or 'none' for new accounts
    last_ref: string;

    // newly computed balance of the account using last_ref's balance
    destination_balance: number;

    // miner will need to sign the block with his private key
    // so that the coinbase destination address can be verified
}

interface IBlock {
    // block's index in the blockchain
    index: number;

    // unix time
    // important: a transaction timestamp older than the last mined block's timestamp
    // should be considered invalid
    timestamp: number;

    // the magic number that makes the block hash fulfill the complexity requirement
    nonce: number;

    // base64 string hash of the JSON.stringified props of the block (minus hash ofc)
    hash: string;
    // base64 string hash of the previous block
    previous_hash: string;

    //
    transactions: string;
    miner_signature: string;
}

// 1. first node spawns and starts mining with newly generated keys
// 2. other nodes join the network and start mining as well
// 3. each node competes in the process of trying to find a gold nonce
//    (fulfilling a certain complexity requirement)
//    for the hash of a block containing a single coinbase transaction
//    with the 'from' field including their own account's public key
// 4. one node eventually finds the gold nonce, signs it with his private key
//    and starts broadcasting it
// 5. receiving nodes validate the block's hash with the complexity requirement
//    along with the (block signature, coinbase 'to' public key) pair
