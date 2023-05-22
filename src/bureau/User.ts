import { Vector3, UserState, Matrix3 } from "../core";
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
    transform?: Matrix3;
    characterData?: string;
}