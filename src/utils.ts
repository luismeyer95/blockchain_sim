import net from "net";

export const dig = <T>(
    arr: Array<T>,
    cb: Parameters<typeof Array.prototype.find>[0]
): any => {
    let ret: any = null;
    let tmp: any = null;
    arr.find((el, index, arr): boolean => {
        tmp = cb(el, index, arr);
        if (tmp && !ret) {
            ret = tmp;
            return true;
        }
        return false;
    });
    return ret;
};

export class TwoWayMap<K, V> {
    private map: Array<[K, V]>;
    constructor(...map: Array<[K, V]>) {
        this.checkUnique(map);
        this.map = map;
    }

    getValue(
        key: K,
        eqcomp: (a: K, b: K) => boolean = (a, b) => a === b
    ): V | null {
        const p = this.map.find((pair) => eqcomp(pair[0], key));
        return p ? p[1] : null;
    }

    getKey(
        val: V,
        eqcomp: (a: V, b: V) => boolean = (a, b) => a === b
    ): K | null {
        const p = this.map.find((pair) => eqcomp(pair[1], val));
        return p ? p[0] : null;
    }

    getMap() {
        return this.map;
    }

    private checkUnique(map: Array<[K, V]>) {
        const keys = map.map((el) => el[0]);
        const set = new Set(keys);
        if (set.size != keys.length) throw new Error("map: key are not unique");
        const vals = map.map((el) => el[1]);
        const valset = new Set(vals);
        if (valset.size != vals.length)
            throw new Error("map: values are not unique");
    }
}
