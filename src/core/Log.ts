import { Config } from ".";
let logBuffer: [string, any[]][] = [];
let paused = false;

function info(message?: any, ...optionalParams: any[]) {
    write(`[INFO] ${message}`, ...optionalParams);
}

function warn(message?: any, ...optionalParams: any[]) {
    write(`[WARN] ${message}`, ...optionalParams);
}

function error(message?: any, ...optionalParams: any[]) {
    if (message instanceof Error)
        write(message, ...optionalParams);
    else
        write(`[ERROR] ${message}`, ...optionalParams);
}

function verbose(message?: any, ...optionalParams: any[]) {
    if (Config.isEnabled("VERBOSE"))
        write(`[VERBOSE] ${message}`, ...optionalParams);
}

function write(message?: any, ...optionalParams: any[]) {
    if (paused)
        logBuffer.push([message, optionalParams]);
    else
        console.log(message, ...optionalParams);
}

function pause() {
    if (paused) return;
    console.log("-- paused --");
    paused = true;
}

function resume() {
    if (!paused) return;
    paused = false;
    for (let i = 0; i < logBuffer.length; ++i) {
        const [messsage, optionalParams] = logBuffer[i];
        console.log(messsage, ...optionalParams);
    }
    logBuffer = [];
}

export const Log = {
    info,
    warn,
    error,
    verbose,
    pause,
    resume
}