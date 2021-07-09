import _ from "lodash";

export class CustomSet<T> {
    private set: T[];

    private comp: (a: T, b: T) => boolean;

    constructor(comp: (a: T, b: T) => boolean) {
        this.comp = comp;
        this.set = [];
    }

    has(value: T) {
        let ret = false;
        this.set.forEach((el) => {
            if (this.comp(el, value)) ret = true;
        });
        return ret;
    }

    delete(value: T) {
        const found = this.set.find((el) => this.comp(el, value));
        if (found) {
            const idx = this.set.indexOf(found);
            if (idx > -1) {
                this.set.splice(idx, 1);
            }
        }
    }

    add(value: T) {
        if (!this.has(value)) this.set.push(value);
    }

    forEach(fn: (el: T) => any) {
        this.set.forEach(fn);
    }

    getArray() {
        return this.set;
    }

    fromArray(arr: T[]) {
        this.set = [];
        arr.forEach((el) => this.add(el));
    }
}
