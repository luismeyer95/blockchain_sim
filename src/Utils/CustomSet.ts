export class CustomSet<T> {
    private set: T[];

    private comp: (a: T, b: T) => boolean;

    constructor(comp: (a: T, b: T) => boolean) {
        this.comp = comp;
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
}
