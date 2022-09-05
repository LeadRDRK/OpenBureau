import { Vector3 } from "../core";
import { SocketState } from ".";

export enum UserState {
    NOT_CONNECTED = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    DISCONNECTING = 3,
    ACTIVE = 4,
    SLEEP = 5
}

export interface User {
    id: number;
    ss: SocketState;
    name: string;
    avatar: string;
    state: UserState;
    bcId: number;
    auras: Set<number>;
    position?: Vector3;
    rotation?: Buffer;
    characterData?: string;
}