import net from "node:net";
import crypto from "node:crypto"
import { Log, Protocol, MessageArray, User } from ".";
import { IPCServer } from "../ipc";

class IdSet extends Set<number> {
    last: number = -1;
    add() {
        ++this.last;
        return super.add(this.last);
    }

    delete(value: number) {
        if (value == this.last) {
            while (--this.last != -1) {
                if (this.has(this.last))
                    break;
            }
        }
        return super.delete(value);
    }
}

export type BcMsgCallback = (user: User) => MessageArray | undefined;

export class State {
    users: {[key: number]: User} = {};
    sockets: {[key: number]: net.Socket} = {};
    idSet = new IdSet;
    bcIdSet = new Set<number>;
    ipc?: IPCServer;

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
        let user = this.users[id];
        let bcId = user.bcId;

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