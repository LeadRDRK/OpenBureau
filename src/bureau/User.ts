import { Vector3, UserState } from "../core";
import { SocketState } from ".";

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