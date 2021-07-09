"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomSet = void 0;
var CustomSet = /** @class */ (function () {
    function CustomSet(comp) {
        this.comp = comp;
        this.set = [];
    }
    CustomSet.prototype.has = function (value) {
        var _this = this;
        var ret = false;
        this.set.forEach(function (el) {
            if (_this.comp(el, value))
                ret = true;
        });
        return ret;
    };
    CustomSet.prototype.delete = function (value) {
        var _this = this;
        var found = this.set.find(function (el) { return _this.comp(el, value); });
        if (found) {
            var idx = this.set.indexOf(found);
            if (idx > -1) {
                this.set.splice(idx, 1);
            }
        }
    };
    CustomSet.prototype.add = function (value) {
        if (!this.has(value))
            this.set.push(value);
    };
    CustomSet.prototype.forEach = function (fn) {
        this.set.forEach(fn);
    };
    CustomSet.prototype.getArray = function () {
        return this.set;
    };
    CustomSet.prototype.fromArray = function (arr) {
        var _this = this;
        this.set = [];
        arr.forEach(function (el) { return _this.add(el); });
    };
    return CustomSet;
}());
exports.CustomSet = CustomSet;
