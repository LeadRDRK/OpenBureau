import net from "node:net";
import crypto from "node:crypto"
import { Protocol, MessageArray, User } from ".";
import { Log, IdSet } from "../core";
import { IpcServer } from "../ipc";

export type BcMsgCallback = (user: User) => MessageArray | undefined;

export class State {
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

        Log.info(`${user.name} has left the server`);
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
            
            return msgs;
        });

        if (this.ipc) {
            this.ipc.broadcastIf({type: "removeUser", content: id}, client => client.listening.removeUser);
            this.ipc.broadcastIf({type: "userCount", content: userCount}, client => client.listening.userCount);
        }
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
}