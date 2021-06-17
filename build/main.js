"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var SwarmNet_1 = __importDefault(require("./NodeNet/SwarmNet"));
var swarm = new SwarmNet_1.default();
process.stdin.on("data", function (data) {
    var message = JSON.stringify({
        type: "MESSAGE",
        payload: swarm.id + "> " + data.toString(),
    });
    swarm.streams.forEach(function (stream) {
        stream.write(message);
    });
    process.stdout.write(swarm.id + "> ");
});
