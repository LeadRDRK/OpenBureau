import { IpcClient } from "../ipc";
import { UserState } from "../core";
import { ChildProcess } from "node:child_process";

export interface BureauUser {
    id: number;
    name: string;
    avatar: string;
    state: UserState;
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