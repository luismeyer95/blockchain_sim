"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
var log = function (data) {
    process.stdout.clearLine(-1); // clear current text
    process.stdout.cursorTo(0);
    process.stdout.write(data);
};
exports.log = log;
//# sourceMappingURL=Loggers.js.map