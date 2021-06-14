"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Node_1 = require("./Node/Node");
var Transactions_1 = require("./Transactions/Transactions");
var Encryption_1 = require("./Encryption/Encryption");
// ///
var account1 = Encryption_1.genKeyPair();
var account2 = Encryption_1.genKeyPair();
var node = new Node_1.Node(account1);
node.mineBlock();
var tx = new Transactions_1.SignedTransaction({
    input: { from: account1.publicKey },
    outputs: [{ to: account2.publicKey, amount: 3 }],
});
node.signAndCreateTransaction(tx, account1.privateKey);
node.mineBlock();
node.printBlockchain();
var findGoldNonce = function (data) {
    var obj = { data: data, nonce: 0 };
    var u32, hashRes, buf;
    do {
        hashRes = Encryption_1.hash(Buffer.from(JSON.stringify(obj)));
        buf = hashRes.copy().digest();
        u32 = buf.readUInt32BE();
        obj.nonce += 1;
    } while (u32 & 0xfffff000);
    console.log(obj.nonce);
    return buf;
};
console.log(findGoldNonce("jello"));
console.log(findGoldNonce("mello"));
console.log(findGoldNonce("hello"));
