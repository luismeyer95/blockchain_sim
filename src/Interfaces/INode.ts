import { KeyPairKeyObjectResult } from "crypto";

export default interface INode {
    getChain(): unknown[];
    mine(keypair: KeyPairKeyObjectResult): void;
}
