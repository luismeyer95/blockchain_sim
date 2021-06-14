import crypto, { KeyPairKeyObjectResult } from "crypto";
import {
    genKeyPair,
    sign,
    verify,
    hash,
    serializeKeyPair,
    deserializeKeyPair,
    findNonce,
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

    test("hash", () => {
        const h = hash(Buffer.from("giraffe")).digest();
        const cmp = crypto.createHash("sha256").update("giraffe").digest();
        expect(h.compare(cmp)).toBe(0);
    });

    test("find nonce", () => {
        const obj = {
            name: "luis",
            age: 26,
        };
        const { hash, nonce } = findNonce<typeof obj>(obj, 12);
        const u32 = hash.readUInt32LE();
        const mask = u32 & 0x0000f0ff;
        expect(mask).toEqual(0);

        expect(findNonce.bind(null, obj, -1)).toThrow();
        expect(findNonce.bind(null, obj, 33)).toThrow();
    });
});
