import net from "node:net";
import { Log } from "../core";
import { IpcData, IpcHandlers, isIpcData } from ".";

export interface IpcConnState {
    socket: net.Socket;
    listening: {[key: string]: boolean};
}

export class IpcServer {
    handlers: IpcHandlers;
    clients = new Set<IpcConnState>;

    constructor(handlers: IpcHandlers) {
        this.handlers = handlers;
    }

    private listener(socket: net.Socket) {
        let client: IpcConnState = { socket, listening: {} };
        this.clients.add(client);

        socket.on("data", buf => {
            const str = buf.toString("utf8");
            
            try {
                const data = JSON.parse(str);
                if (!isIpcData(data)) return;

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

    broadcastIf(data: IpcData, predicate: (client: IpcConnState) => boolean) {
        this.clients.forEach(client => {
            if (predicate(client))
                client.socket.write(JSON.stringify(data));
        });
    }
}