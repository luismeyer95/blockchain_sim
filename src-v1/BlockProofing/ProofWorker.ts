import EventEmitter from "events";
import IBlockProofing from "src/BlockProofing/IBlockProofing";
import randomstring from "randomstring";
import { ChildProcess, fork } from "child_process";
import { z } from "zod";
import ILogger from "src/Logger/ILogger";
import { log } from "src/Logger/Loggers";
import { isNonceGold } from "src/Encryption/Encryption";

const PowProcessMessage = z
    .object({
        data: z.string(),
        complexity: z.number(),
        nonce: z.number(),
    })
    .strict();

export type PowProcessMessage = z.infer<typeof PowProcessMessage>;

// forks and manages a proof-of-work process to which data is fed
// through updateTaskData. emits a "pow" event when an acceptable
// proof is found for the latest fed data.
export default class ProofWorker
    extends EventEmitter
    implements IBlockProofing
{
    private worker: ChildProcess;
    private log: ILogger;
    constructor(logger: ILogger = log) {
        super();
        this.log = logger;
        this.worker = fork("./src/BlockProofing/pow_process.ts", [], {
            execArgv: ["-r", "ts-node/register"],
        });
        // this.worker = fork("pow_process.ts");
        this.worker.on("message", (msg: unknown) => {
            const messageValidation = PowProcessMessage.safeParse(msg);
            if (messageValidation.success) {
                const receivedNonce = messageValidation.data.nonce;
                const nonceValidator = isNonceGold(
                    receivedNonce,
                    messageValidation.data.data,
                    messageValidation.data.complexity
                );
                if (nonceValidator.success)
                    this.emit("pow", messageValidation.data);
            } else {
                console.log("[pow parent]: bad worker response");
            }
        });
    }

    // updates the data to be mined by the forked process
    updateTaskData(data: string, complexity: number): void {
        this.worker.send(
            JSON.stringify({
                data,
                complexity,
            })
        );
    }
}
