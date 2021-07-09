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
var PowProcessMessage = zod_1.z
    .object({
    data: zod_1.z.string(),
    complexity: zod_1.z.number(),
    nonce: zod_1.z.number(),
})
    .strict();
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
        // this.worker = fork("pow_process.ts");
        _this.worker.on("message", function (msg) {
            var messageValidation = PowProcessMessage.safeParse(msg);
            if (messageValidation.success) {
                var receivedNonce = messageValidation.data.nonce;
                var nonceValidator = Encryption_1.isNonceGold(receivedNonce, messageValidation.data.data, messageValidation.data.complexity);
                if (nonceValidator.success)
                    _this.emit("pow", messageValidation.data);
            }
            else {
                console.log("[pow parent]: bad worker response");
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
    return ProofWorker;
}(events_1.default));
exports.default = ProofWorker;
