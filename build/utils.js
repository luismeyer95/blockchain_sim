"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoWayMap = exports.dig = void 0;
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
var TwoWayMap = /** @class */ (function () {
    function TwoWayMap() {
        var map = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            map[_i] = arguments[_i];
        }
        this.checkUnique(map);
        this.map = map;
    }
    TwoWayMap.prototype.getValue = function (key, eqcomp) {
        if (eqcomp === void 0) { eqcomp = function (a, b) { return a === b; }; }
        var p = this.map.find(function (pair) { return eqcomp(pair[0], key); });
        return p ? p[1] : null;
    };
    TwoWayMap.prototype.getKey = function (val, eqcomp) {
        if (eqcomp === void 0) { eqcomp = function (a, b) { return a === b; }; }
        var p = this.map.find(function (pair) { return eqcomp(pair[1], val); });
        return p ? p[0] : null;
    };
    TwoWayMap.prototype.getMap = function () {
        return this.map;
    };
    TwoWayMap.prototype.checkUnique = function (map) {
        var keys = map.map(function (el) { return el[0]; });
        var set = new Set(keys);
        if (set.size != keys.length)
            throw new Error("map: key are not unique");
        var vals = map.map(function (el) { return el[1]; });
        var valset = new Set(vals);
        if (valset.size != vals.length)
            throw new Error("map: values are not unique");
    };
    return TwoWayMap;
}());
exports.TwoWayMap = TwoWayMap;
