import { KeyPairKeyObjectResult } from "crypto";
import crypto from "crypto";
import { Node, SignedTransaction } from "./Node";
import { genKeyPair, sign, verify, hash, serializeKey } from "./RSAEncryption";
import readline from "readline";
import { exit } from "process";
// import { WalletAccount } from "./Account";

const acc1: KeyPairKeyObjectResult = genKeyPair();
const dataToSign: Buffer = Buffer.from("giraffe");
const signature: Buffer = sign(dataToSign, acc1.privateKey);
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

const findGoldNonce = (data: any) => {
    const obj = { data, nonce: 0 };
    let u32, hashRes, buf;
    do {
        hashRes = hash(Buffer.from(JSON.stringify(obj)));
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
