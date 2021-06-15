export type Input<T> = { from: T };
export type Output<T> = { to: T; amount: number; balance?: number };
// export type BalancedOutput<T> = Output<T> & { balance: number };
