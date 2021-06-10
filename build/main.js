"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RSAEncryption_1 = require("./RSAEncryption");
// import { WalletAccount } from "./Account";
var acc1 = RSAEncryption_1.genKeyPair();
var dataToSign = Buffer.from("giraffe");
var signature = RSAEncryption_1.sign(dataToSign, acc1.privateKey);
// console.log(verify(dataToSign, acc1.publicKey, signature));
// ///
// const account1 = genKeyPair();
// const account2 = genKeyPair();
// const node = new Node(account1);
// node.mineBlock();
// const tx = new SignedTransaction({
//     input: { from: account1.publicKey },
//     outputs: [{ to: account2.publicKey, amount: 3 }],
// });
// node.signAndCreateTransaction(tx, account1.privateKey);
// node.mineBlock();
// node.printBlockchain();
var findGoldNonce = function (data) {
    var obj = { data: data, nonce: 0 };
    var u32, hashRes, buf;
    do {
        hashRes = RSAEncryption_1.hash(Buffer.from(JSON.stringify(obj)));
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
