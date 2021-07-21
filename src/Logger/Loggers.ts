import ILogger from "src/Logger/ILogger";

export const log: ILogger = (data) => {
    // process.stdout.clearLine(-1); // clear current text
    // process.stdout.cursorTo(0);
    process.stdout.write(data);
};
