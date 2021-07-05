import INodeNet from "src/Interfaces/INodeNet";
import { EventEmitter } from "stream";

export class NodeNet implements INodeNet {
    events: EventEmitter;

    constructor() {}
}
