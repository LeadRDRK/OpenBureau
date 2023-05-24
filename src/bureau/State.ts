import net from "node:net";
import crypto from "node:crypto"
import { Protocol, MessageArray, User, BureauUtils } from ".";
import { Log, IdSet, Config, TypedEventEmitter } from "../core";
import { IpcServer } from "../ipc";
import EventEmitter from "node:events";

export type BcMsgCallback = (user: User) => MessageArray | void;

type StateEvents = {
    newUser: (user: User) => void;
    applSpecific: (args: string[]) => void;
    chatSend: (detail: { id: number, message: string }) => void;
    privateChat: (detail: { from: number, to: number, message: string }) => void;
    removeUser: (user: User) => void;
}

export class State extends (EventEmitter as new () => TypedEventEmitter<StateEvents>) {
    users: {[key: number]: User} = {};
    sockets: {[key: number]: net.Socket} = {};
    idSet = new IdSet;
    bcIdSet = new Set<number>;
    isFull = false;
    ipc?: IpcServer;

    broadcast(callback: BcMsgCallback) {
        let buf: Buffer | undefined;
        for (const id in this.users) {
            let user = this.users[id];
            let messages = callback(user);
            if (!messages || messages.length == 0) continue;

            buf = Protocol.buildPacket(messages, buf);
            user.ss.write(buf);
        }
    }

    getUserCount() {
        return Object.keys(this.users).length;
    }

    getNewId() {
        if (this.idSet.last == 255) return -1;
        return this.idSet.add().last;
    }

    removeUser(id: number) {
        delete this.sockets[id];
        this.idSet.delete(id);

        if (!(id in this.users)) return;
        const user = this.users[id];
        const bcId = user.bcId;

        this.emit("removeUser", user);

        const leftMsg = `${user.name} has left the server`;
        Log.info(leftMsg);
        this.bcIdSet.delete(bcId);
        delete this.users[id];

        let userCount = this.getUserCount();
        this.broadcast(user => {
            let msgs = [
                {id1: 0, id2: user.id, type: Protocol.Opcode.SMSG_USER_COUNT, content: Protocol.userCountContent(userCount)}
            ];

            if (user.auras.has(bcId)) {
                msgs.push({
                    id1: user.id, id2: user.id, type: Protocol.Opcode.SMSG_USER_LEFT,
                    content: Protocol.userLeftContent(bcId)
                });
                user.auras.delete(bcId);
            }

            if (Config.isEnabled("USER_ANNOUNCE"))
                msgs.push(...BureauUtils.buildSystemChatMsg(user.id, leftMsg, true));
            
            return msgs;
        });
    }

    generateBcId(): Promise<number> {
        return new Promise((resolve, reject) => {
            crypto.randomInt(1, 0xFFFF, async (err, value) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Collision check
                if (this.bcIdSet.has(value)) {
                    resolve(await this.generateBcId());
                    return;
                }

                this.bcIdSet.add(value);
                resolve(value);
            });
        });
    }

    initIpcEvents() {
        if (!this.ipc) return;
        let ipc = this.ipc;
        this.on("newUser", user => {
            ipc.broadcastIf({
                type: "newUser",
                content: {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    state: user.state,
                    bcId: user.bcId,
                    address: user.ss.address
                }
            }, client => client.listening.newUser);
            ipc.broadcastIf({type: "userCount", content: this.getUserCount()}, client => client.listening.userCount);

            user.on("nameChange", () => {
                ipc.broadcastIf({type: "nameChange", content: {id: user.id, name: user.name}},
                                client => client.listening.nameChange);
            })
            .on("avatarChange", () => {
                ipc.broadcastIf({type: "avatarChange", content: {id: user.id, avatar: user.avatar}},
                                client => client.listening.avatarChange);
            })
            .on("stateChange", () => {
                ipc.broadcastIf({type: "stateChange", content: {id: user.id, state: user.state}},
                                client => client.listening.stateChange);
            });
        })
        .on("chatSend", detail => {
            ipc.broadcastIf({type: "chatSend", content: detail}, client => client.listening.chat);
        })
        .on("privateChat", detail => {
            ipc.broadcastIf({type: "privateChat", content: detail}, client => client.listening.privateChat);
        })
        .on("removeUser", user => {
            ipc.broadcastIf({type: "removeUser", content: user.id}, client => client.listening.removeUser);
            ipc.broadcastIf({type: "userCount", content: this.getUserCount() - 1}, client => client.listening.userCount);
        });
    }
}