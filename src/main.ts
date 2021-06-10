import { KeyPairKeyObjectResult } from "crypto";
import crypto from "crypto";
import { Node, SignedTransaction } from "./Node";
import { genKeyPair, sign, verify, hash } from "./RSAEncryption";
import readline from "readline";
import { exit } from "process";
// import { WalletAccount } from "./Account";

const acc1: KeyPairKeyObjectResult = genKeyPair();
const dataToSign: Buffer = Buffer.from("giraffe");
const signature: Buffer = sign(dataToSign, acc1.privateKey);
// console.log(verify(dataToSign, acc1.publicKey, signature));

// ///
const account1 = genKeyPair();
const account2 = genKeyPair();
const node = new Node(account1);

node.mineBlock();

const tx = new SignedTransaction({
    input: { from: account1.publicKey },
    outputs: [{ to: account2.publicKey, amount: 3 }],
});

tx.sign(account1.privateKey);

console.log(tx);
const serial: string = tx.serialize(null, 2);

const parsedTx: SignedTransaction = new SignedTransaction(serial);
