import { SocketState, Vector3 } from ".";

export enum UserState {
    LEAVING = 3,
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
    sleepState?: string;
}