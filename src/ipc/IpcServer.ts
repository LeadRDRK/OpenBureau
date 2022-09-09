import net from "node:net";
import { Log } from "../core";
import { IpcData, IpcHandlers, isIpcData } from ".";

export interface IpcConnState {
    socket: net.Socket;
    listening: {[key: string]: boolean};
}

export enum IpcError {
    INVALID_TYPE,
    INVALID_ARGS
}

const builtInHandlers: {[key: string]: (client: IpcConnState, content: any) => IpcData | void} = {
    listen(client: IpcConnState, args: any) {
        if (typeof args == "string")
            args = [args];

        if (!Array.isArray(args))
            return {type: "error", content: IpcError.INVALID_ARGS};

        for (let i = 0; i < args.length; ++i) {
            const value = args[i];
            if (typeof value != "string")
                return {type: "error", content: IpcError.INVALID_ARGS};

            client.listening[value] = true;
        };
    },

    unlisten(client: IpcConnState, args: any) {
        if (typeof args == "string")
            args = [args];

        if (!Array.isArray(args))
            return {type: "error", content: IpcError.INVALID_ARGS};

        for (let i = 0; i < args.length; ++i) {
            const value = args[i];
            if (typeof value != "string")
                return {type: "error", content: IpcError.INVALID_ARGS};

            delete client.listening[value];
        };
    }
};

export class IpcServer {
    handlers: IpcHandlers;
    state: any;
    clients = new Set<IpcConnState>;

    constructor(handlers: IpcHandlers, state: any) {
        this.handlers = handlers;
        this.state = state;
    }

    private listener(socket: net.Socket) {
        const a = socket.address();
        if ("address" in a && !a.address.includes("127.0.0.1")) {
            Log.warn(`Blocking external IPC connection from ${a.address}`);
            socket.destroy();
            return;
        }

        let client: IpcConnState = { socket, listening: {} };
        this.clients.add(client);

        socket.on("data", buf => {
            const content = buf.toString("utf8");
            const split = content.split("\0");
            for (let i = 0; i < split.length - 1; ++i) {
                const str = split[i];
                try {
                    const data = JSON.parse(str);
                    if (!isIpcData(data)) return;

                    let res: IpcData | void;
                    if (data.type in this.handlers) 
                        res = this.handlers[data.type](this.state, data.content);
                    else if (data.type in builtInHandlers)
                        res = builtInHandlers[data.type](client, data.content);
                    else
                        res = {type: "error", content: IpcError.INVALID_TYPE};

                    if (res) {
                        res.tag = data.tag;
                        socket.write(JSON.stringify(res) + "\0");
                    }
                }
                catch {
                    Log.error("Failed to parse JSON from IPC message");
                }
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
                client.socket.write(JSON.stringify(data) + "\0");
        });
    }
}