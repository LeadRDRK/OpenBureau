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
    process: ChildProcess;
    ipc: IpcClient;
    listen: boolean;
    isFull: boolean;
    timeout?: NodeJS.Timeout;
}