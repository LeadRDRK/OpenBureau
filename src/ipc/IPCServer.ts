import net from "node:net";
import { Log } from "../core";
import { IPCHandlers, isIPCData } from ".";
import fs from "node:fs";

export class IPCServer {
    handlers: IPCHandlers;

    constructor(handlers: IPCHandlers) {
        this.handlers = handlers;
    }

    private listener(socket: net.Socket) {
        socket.on("data", buf => {
            const str = buf.toString("utf8");
            
            try {
                const data = JSON.parse(str);
                if (!isIPCData(data)) return;

                if (data.type in this.handlers) {
                    const res = this.handlers[data.type](...data.args);
                    if (!res) return;
                    socket.write(JSON.stringify(res));
                }
            }
            catch (e) {
                Log.error(e);
            }
        })
        .on("error", Log.error);
    }

    init(port: number, callback?: () => void): void;
    init(path: string, callback?: () => void): void;
    init(portOrPath: number | string, callback?: () => void) {
        // For unix sockets
        if (typeof portOrPath == "string" && fs.existsSync(portOrPath))
            fs.unlinkSync(portOrPath);

        const server = net.createServer(this.listener.bind(this))
        .on("error", Log.error)
        .listen(portOrPath);

        if (callback) server.on("listening", callback);
    }
}