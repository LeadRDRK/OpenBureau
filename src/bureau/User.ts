import { Vector3, UserState, Matrix3, TypedEventEmitter } from "../core";
import { SocketState } from ".";
import EventEmitter from "node:events";

type UserEvents = {
    nameChange: () => void;
    avatarChange: () => void;
    transformUpdate: () => void;
    positionUpdate: () => void;
    characterUpdate: () => void;
    stateChange: () => void;
}

export class User extends (EventEmitter as new () => TypedEventEmitter<UserEvents>) {
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

    constructor(
        ss: SocketState,
        name: string,
        avatar: string,
        bcId: number
    ) {
        super();
        this.id = ss.id;
        this.ss = ss;
        this.name = name;
        this.avatar = avatar;
        this.state = UserState.ACTIVE;
        this.bcId = bcId;
        this.auras = new Set<number>([bcId]);
    }
}