"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = __importDefault(require("events"));
var child_process_1 = require("child_process");
var zod_1 = require("zod");
var Loggers_1 = require("src/Logger/Loggers");
var Encryption_1 = require("src/Encryption/Encryption");
var PowProcessMessage = zod_1.z.object({
    data: zod_1.z.string(),
    nonce: zod_1.z.number(),
});
// forks and manages a proof-of-work process to which data is fed
// through updateTaskData. emits a "pow" event when an acceptable
// proof is found for the latest fed data.
var ProofWorker = /** @class */ (function (_super) {
    __extends(ProofWorker, _super);
    function ProofWorker(logger) {
        if (logger === void 0) { logger = Loggers_1.log; }
        var _this = _super.call(this) || this;
        _this.log = logger;
        _this.worker = child_process_1.fork("./src/BlockProofing/pow_process.ts", [], {
            execArgv: ["-r", "ts-node/register"],
        });
        _this.worker.on("message", function (msg) {
            var messageValidation = PowProcessMessage.safeParse(msg);
            if (messageValidation.success)
                _this.emit("pow", messageValidation.data);
            else {
            }
        });
        return _this;
    }
    // updates the data to be mined by the forked process
    ProofWorker.prototype.updateTaskData = function (data, complexity) {
        this.worker.send(JSON.stringify({
            data: data,
            complexity: complexity,
        }));
    };
    ProofWorker.prototype.testHash = function (nonce, strdata, leadingZeroBits) {
        if (leadingZeroBits < 0 || leadingZeroBits > 32)
            throw new Error("findNonce error: invalid leadingZeroBits argument");
        var bitnum = ~(1 << (31 - leadingZeroBits));
        var hashRes = Encryption_1.hash(Buffer.from(strdata));
        var buf = hashRes.copy().digest();
        var u32 = buf.readUInt32BE();
        return !(u32 & bitnum);
    };
    return ProofWorker;
}(events_1.default));
exports.default = ProofWorker;
