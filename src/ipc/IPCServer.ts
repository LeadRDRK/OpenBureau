import net from "node:net";
import { Log } from "../core";
import { IPCData, IPCHandlers, isIPCData } from ".";
import fs from "node:fs";

export interface IPCConnState {
    socket: net.Socket;
    listening: {[key: string]: boolean};
}

export class IPCServer {
    handlers: IPCHandlers;
    clients = new Set<IPCConnState>;

    constructor(handlers: IPCHandlers) {
        this.handlers = handlers;
    }

    private listener(socket: net.Socket) {
        let client: IPCConnState = { socket, listening: {} };
        this.clients.add(client);

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
        .on("error", Log.error)
        .on("close", () => this.clients.delete(client));
    }

    init(port: number, callback?: () => void): void;
    init(path: string, callback?: () => void): void;
    init(portOrPath: number | string, callback?: () => void) {
        const server = net.createServer(this.listener.bind(this))
        .on("error", Log.error)
        .listen(portOrPath);

        if (callback) server.on("listening", callback);
    }

    broadcastIf(data: IPCData, predicate: (client: IPCConnState) => boolean) {
        this.clients.forEach(client => {
            if (predicate(client))
                client.socket.write(JSON.stringify(data));
        });
    }
}