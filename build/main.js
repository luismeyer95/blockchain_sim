"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Node_1 = require("./Node");
var RSAEncryption_1 = require("./RSAEncryption");
// import { WalletAccount } from "./Account";
var acc1 = RSAEncryption_1.genKeyPair();
var dataToSign = Buffer.from("giraffe");
var signature = RSAEncryption_1.sign(dataToSign, acc1.privateKey);
// console.log(verify(dataToSign, acc1.publicKey, signature));
// ///
var account1 = RSAEncryption_1.genKeyPair();
var account2 = RSAEncryption_1.genKeyPair();
var node = new Node_1.Node(account1);
node.mineBlock();
var tx = new Node_1.SignedTransaction({
    input: { from: account1.publicKey },
    outputs: [{ to: account2.publicKey, amount: 3 }],
});
tx.sign(account1.privateKey);
console.log(tx);
var serial = tx.serialize(null, 2);
var parsedTx = new Node_1.SignedTransaction(serial);
console.log(parsedTx);
console.log(parsedTx.isValid());
