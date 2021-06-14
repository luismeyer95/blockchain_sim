"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dig = void 0;
var dig = function (arr, cb) {
    var ret = null;
    var tmp = null;
    arr.find(function (el, index, arr) {
        tmp = cb(el, index, arr);
        if (tmp && !ret) {
            ret = tmp;
            return true;
        }
        return false;
    });
    return ret;
};
exports.dig = dig;
