import { SignedTransaction } from "./SignedTransaction";
import { InitialTransaction } from "./InitialTransaction";
import type { Input, Output } from "./InputOutput";
import { KeyObject } from "crypto";

// type BalancedTX<T extends SignedTransaction | InitialTransaction> = {
//     [Prop in keyof T]: Prop extends "outputs"
//         ? BalancedOutput<KeyObject>[]
//         : Prop extends "output"
//         ? BalancedOutput<KeyObject>
//         : T[Prop];
// };

export { SignedTransaction, InitialTransaction, Input, Output };
