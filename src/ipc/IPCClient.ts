import net from "node:net";
import { Log } from "../core";
import { IPCData, isIPCData } from ".";
import { EventEmitter } from "node:events";

const TAG_TIMEOUT = 5000;

export declare interface IPCClient {
    /**
     * events.EventEmitter
     *   1. data
     */
    addListener(event: string, listener: (...args: any[]) => void): this;
    addListener(event: "data", listener: (data: IPCData) => void): this;
    emit(event: string | symbol, ...args: any[]): boolean;
    emit(event: "data", data: IPCData): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
    on(event: "data", listener: (data: IPCData) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    once(event: "data", listener: (data: IPCData) => void): this;
    prependListener(event: string, listener: (...args: any[]) => void): this;
    prependListener(event: "data", listener: (data: IPCData) => void): this;
    prependOnceListener(event: string, listener: (...args: any[]) => void): this;
    prependOnceListener(event: "data", listener: (data: IPCData) => void): this;
}

export class IPCClient extends EventEmitter {
    socket: net.Socket;
    private tagListeners: {[key: string]: (...args: any[]) => void} = {};

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
            if (!isIPCData(data)) return;

            if (data.tag in this.tagListeners) {
                this.tagListeners[data.tag](...data.args);
                delete this.tagListeners[data.tag];
            }

            this.emit("data", data);
        }
        catch (e) {
            Log.error(e);
        }
    }

    write(data: IPCData): boolean {
        return this.socket.write(JSON.stringify(data));
    }

    generateTag(): string {
        const tag = Math.random().toString(36);
        if (tag in this.tagListeners) return this.generateTag();
        return tag;
    }

    addTagListener(tag: string, listener: (...args: any[]) => void) {
        if (tag in this.tagListeners)
            throw new Error("Tag listener already exists");
        
        this.tagListeners[tag] = listener;
        setTimeout(() => delete this.tagListeners[tag], TAG_TIMEOUT);
    }

    sendRequest(data: IPCData, callback: (...args: any[]) => void, autoTag = true) {
        if (autoTag)
            data.tag = this.generateTag();
        
        this.addTagListener(data.tag, callback);
        this.write(data);
    }
}