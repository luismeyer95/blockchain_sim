"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeGreeting = exports.greetCount = void 0;
exports.greetCount = 0;
function makeGreeting(str) {
    console.log(str);
    ++exports.greetCount;
}
exports.makeGreeting = makeGreeting;
