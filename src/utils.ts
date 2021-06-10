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
