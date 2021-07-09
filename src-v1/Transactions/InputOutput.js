"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOutput = exports.isInput = void 0;
// export type BalancedOutput<T> = Output<T> & { balance: number };
function isInput(obj) {
    return obj.from !== undefined;
}
exports.isInput = isInput;
function isOutput(obj) {
    return (obj.to !== undefined &&
        typeof obj.amount === "number" &&
        (typeof obj.balance === "number" || typeof obj.balance === "undefined"));
}
exports.isOutput = isOutput;
