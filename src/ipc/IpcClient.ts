import net from "node:net";
import { Log } from "../core";
import { IpcData, isIpcData } from ".";
import { EventEmitter } from "node:events";

const TAG_TIMEOUT = 5000;

export declare interface IpcClient {
    /**
     * events.EventEmitter
     *   1. data
     */
    addListener(event: string, listener: (...args: any[]) => void): this;
    addListener(event: "data", listener: (data: IpcData) => void): this;
    emit(event: string | symbol, ...args: any[]): boolean;
    emit(event: "data", data: IpcData): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
    on(event: "data", listener: (data: IpcData) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    once(event: "data", listener: (data: IpcData) => void): this;
    prependListener(event: string, listener: (...args: any[]) => void): this;
    prependListener(event: "data", listener: (data: IpcData) => void): this;
    prependOnceListener(event: string, listener: (...args: any[]) => void): this;
    prependOnceListener(event: "data", listener: (data: IpcData) => void): this;
}

export class IpcClient extends EventEmitter {
    socket: net.Socket;
    private tagListeners: {[key: string]: (content: any) => void} = {};

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
        const str = buf.toString("utf8");
        try {
            const data = JSON.parse(str);
            if (!isIpcData(data)) return;

            if (data.tag in this.tagListeners) {
                this.tagListeners[data.tag](data.content);
                delete this.tagListeners[data.tag];
            }

            this.emit("data", data);
        }
        catch (e) {
            Log.error(e);
        }
    }

    write(data: IpcData): boolean {
        return this.socket.write(JSON.stringify(data));
    }

    generateTag(): string {
        const tag = Math.random().toString(36);
        if (tag in this.tagListeners) return this.generateTag();
        return tag;
    }

    addTagListener(tag: string, listener: (content: any) => void) {
        if (tag in this.tagListeners)
            throw new Error("Tag listener already exists");
        
        this.tagListeners[tag] = listener;
        setTimeout(() => delete this.tagListeners[tag], TAG_TIMEOUT);
    }

    sendRequest(data: IpcData, callback: (content: any) => void, autoTag = true) {
        if (autoTag)
            data.tag = this.generateTag();
        
        this.addTagListener(data.tag, callback);
        this.write(data);
    }
}