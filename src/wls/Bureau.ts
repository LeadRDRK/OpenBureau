import { IpcClient } from "../ipc";
import { ChildProcess } from "node:child_process";

export interface BureauUser {
    id: number;
    name: string;
    avatar: string;
    address: string;
}

export interface Bureau {
    id: number;
    world: string;
    port: number;
    users: {[key: number]: BureauUser};
    maxConn: number;
    process: ChildProcess;
    ipc: IpcClient;
    socketPath: string;
    listen: boolean;
    isFull: boolean;
    timeout?: NodeJS.Timeout;
}