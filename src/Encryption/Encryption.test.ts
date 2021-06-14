import { KeyPairKeyObjectResult } from "crypto";
import {
    genKeyPair,
    sign,
    verify,
    hash,
    serializeKeyPair,
    deserializeKeyPair,
    deserializeKey,
} from "./Encryption";

describe("Encryption module tests", () => {
    let acc1: KeyPairKeyObjectResult;
    const signAndVerify = (
        acc1: KeyPairKeyObjectResult,
        acc2: KeyPairKeyObjectResult
    ) => {
        let dataToSign: Buffer = Buffer.from("giraffe");
        let signature: Buffer = sign(dataToSign, acc1.privateKey);
        let valid: boolean = verify(dataToSign, acc1.publicKey, signature);
        expect(valid).toEqual(true);

        signature = sign(dataToSign, acc2.privateKey);
        valid = verify(dataToSign, acc1.publicKey, signature);
        expect(valid).toEqual(false);
    };

    beforeEach(() => (acc1 = genKeyPair()));

    test("signing and verifying buffers", () => {
        signAndVerify(acc1, genKeyPair());
    });

    test("serializing-deserialize does not compromise key pairs", () => {
        const serial = serializeKeyPair(acc1);
        const back = deserializeKeyPair(serial);

        signAndVerify(back, genKeyPair());
    });
});
