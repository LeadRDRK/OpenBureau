import { Vector3, UserState, Matrix3x4 } from "../core";
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
    rotation?: Matrix3x4;
    characterData?: string;
}