export type Input<T> = { from: T };
export type Output<T> = { to: T; amount: number; balance?: number };
import { KeyObject } from "crypto";
import { z } from "zod";
// export type BalancedOutput<T> = Output<T> & { balance: number };

export function isInput<T>(obj: any): obj is Input<T> {
    return obj.from !== undefined;
}

export function isOutput<T>(obj: any): obj is Output<T> {
    return (
        obj.to !== undefined &&
        typeof obj.amount === "number" &&
        (typeof obj.balance === "number" || typeof obj.balance === "undefined")
    );
}
