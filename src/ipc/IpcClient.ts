import net from "node:net";
import { Log, TypedEventEmitter } from "../core";
import { IpcData, isIpcData } from ".";
import { EventEmitter } from "node:events";

const TAG_TIMEOUT = 5000;

type IpcClientEvents = {
    data: (...args: any[]) => void;
}

export class IpcClient extends (EventEmitter as new () => TypedEventEmitter<IpcClientEvents>) {
    socket: net.Socket;
    private tagListeners: {[key: string]: (data: IpcData) => void} = {};

    constructor(port: number, host?: string);
    constructor(path: string);
    constructor(portOrPath: number | string, host = "localhost") {
        super();

        if (typeof portOrPath == "number")
            this.socket = net.createConnection(portOrPath, host);
        else
            this.socket = net.createConnection(portOrPath);
        
        this.socket.on("data", this.dataListener.bind(this))
                   .on("error", Log.error);
    }

    private dataListener(buf: Buffer) {
        const content = buf.toString("utf8");
        const split = content.split("\0");
        for (let i = 0; i < split.length - 1; ++i) {
            const str = split[i];
            try {
                const data = JSON.parse(str);
                if (!isIpcData(data)) return;

                if (data.tag in this.tagListeners) {
                    this.tagListeners[data.tag](data);
                    delete this.tagListeners[data.tag];
                }

                this.emit("data", data);
            }
            catch (e) {
                Log.error(e);
            }
        }
    }

    write(data: IpcData): boolean {
        return this.socket.write(JSON.stringify(data) + "\0");
    }

    generateTag(): string {
        const tag = Math.random().toString(36);
        if (tag in this.tagListeners) return this.generateTag();
        return tag;
    }

    addTagListener(tag: string, listener: (data: IpcData) => void) {
        if (tag in this.tagListeners)
            throw new Error("Tag listener already exists");
        
        this.tagListeners[tag] = listener;
        setTimeout(() => {
            listener({type: "failed", tag});
            delete this.tagListeners[tag];
        }, TAG_TIMEOUT);
    }

    sendRequest(data: IpcData, autoTag = true): Promise<IpcData> {
        return new Promise(resolve => {
            if (autoTag)
                data.tag = this.generateTag();
            
            this.addTagListener(data.tag, data => {
                resolve(data);
            });
            this.write(data);
        });
    }
}