import { State, SocketState, User, BureauUtils } from ".";
import { Log, Config, Vector3, BanList, UserState, Matrix3 } from "../core";

const CLIENT_HELLO = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x01, 0x01]);
const SERVER_HELLO_PREFIX = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

enum SectionType {
    GENERAL_MSG     = 0,
    POSITION_UPDATE = 2
}

enum Opcode {
    CMSG_NEW_USER     = 0,
    SMSG_CLIENT_ID    = 1,
    SMSG_USER_JOINED  = 2,
    SMSG_USER_LEFT    = 3,
    SMSG_BROADCAST_ID = 4,
    MSG_COMMON        = 6,
    CMSG_STATE_CHANGE = 7,
    SMSG_UNNAMED_1    = 8,
    SMSG_USER_COUNT   = 11
}

interface MessageBase {
    id1: number;
    id2: number;
}

export interface GeneralMsg extends MessageBase {
    type: Opcode;
    content: Buffer;
}

export interface PositionMsg extends MessageBase {
    bcId: number;
    position: Vector3;
}

export type MessageArray = (GeneralMsg | PositionMsg)[];

enum CDataType {
    APPL_SPECIFIC    = 0x10270000,
    CHAT_SEND        = 0x09000000,
    NAME_CHANGE      = 0x0D000000,
    AVATAR_CHANGE    = 0x0E000000,
    TRANSFORM_UPDATE = 0x02000000,
    CHARACTER_UPDATE = 0x0C000000,
    VOICE_STATE      = 0x12000000,
    UNNAMED_1        = 0x10000000,
    PRIVATE_CHAT     = 0x0F000000
}

interface CommonData {
    idType: number;
    bcId: number;
    type: CDataType;
    subtype: number;
    content: Buffer;
}

let auraRadius: number;
let welcomeMsg: string | undefined;
let userTimeout: number;

function init() {
    auraRadius = +Config.get("AURA_RADIUS", "0");
    welcomeMsg = Config.get("WELCOME_MSG");
    if (welcomeMsg) welcomeMsg = welcomeMsg.replace(/\\n/g, "\n");
    userTimeout = +Config.get("USER_TIMEOUT", "30000");
}

function bufcpy(dst: Buffer, src: Buffer, offset: number) {
    let end = offset + src.length;
    dst.fill(src, offset, end);
    return end;
}

function readStrings(data: Buffer, count: number): string[] {
    let res: string[] = [];
    let j = 0, start = 0;
    for (let i = 0; i < count; ++i) {
        for (; j < data.length; ++j) {
            if (data[j] == 0x00) {
                res.push(data.subarray(start, j).toString("utf8"));
                start = j + 1;
                ++j;
                break;
            }
        }
    }
    return res;
}

function writeString(data: Buffer, str: string, offset: number): number {
    let n = offset + data.write(str, offset);
    n = data.writeUint8(0, n); // null terminator
    return n;
}

function writeBcId(buf: Buffer, idType: number, bcId: number, offset: number) {
    let n = buf.writeUint16LE(idType, offset);
    n = buf.writeUint16LE(bcId, n);
    return n;
}

function readInt32Float(data: Buffer, offset: number) {
    return data.readInt32BE(offset) / 65536;
}

function writeInt32Float(data: Buffer, value: number, offset: number) {
    value *= 65536;
    value = Math.max(-0x80000000, Math.min(value, 0x7FFFFFFF));
    return data.writeInt32BE(value, offset);
}

function buildPacket(messages: MessageArray, buf?: Buffer): Buffer {
    let totalSize = 0;
    for (let i = 0; i < messages.length; ++i) {
        let msg = messages[i];
        if ("content" in msg) // GeneralMsg
            totalSize += 17 + msg.content.length;
        else // PositionMsg
            totalSize += 27;
    }
    
    // Allow buffer recycling
    if (!buf || buf.length < totalSize)
        buf = Buffer.allocUnsafe(totalSize);
    
    let j = 0;
    for (let i = 0; i < messages.length; ++i) {
        let msg = messages[i];
        let type = ("content" in msg) ? SectionType.GENERAL_MSG : SectionType.POSITION_UPDATE;

        j = buf.writeUint32LE(type, j)
        j = buf.writeUint32LE(msg.id1, j);

        if ("content" in msg) {
            j = buf.writeUint32LE(msg.id2, j);
            j = buf.writeUint32LE(msg.type, j);
            j = buf.writeUint8(msg.content.length, j);
            j = bufcpy(buf, msg.content, j);
        }
        else {
            let pos = msg.position;
            j = buf.writeUint8(msg.id2, j);
            j = buf.writeUint16LE(0x00, j);
            j = buf.writeUInt16LE(msg.bcId, j);
            j = writeInt32Float(buf, pos.x, j);
            j = writeInt32Float(buf, pos.y, j);
            j = writeInt32Float(buf, pos.z, j);
            j = buf.writeUint16LE(0x100, j);
        }
    }
    return buf;
}

function buildCommonData(data: CommonData) {
    let totalSize = 9 + data.content.length;

    let buf = Buffer.allocUnsafe(totalSize);
    
    let n = writeBcId(buf, data.idType, data.bcId, 0);
    n = buf.writeUint32LE(data.type, n);
    n = buf.writeUint8(data.subtype, n);
    n = bufcpy(buf, data.content, n);
    
    return buf;
}

function buildCharUpdateMsg(id: number, bcId: number, characterData: string): GeneralMsg {
    let buf = Buffer.allocUnsafe(Buffer.byteLength(characterData, "utf8") + 1);
    writeString(buf, characterData, 0);
    return {
        id1: id, id2: id, type: Opcode.MSG_COMMON,
        content: buildCommonData({idType: 0x00, bcId, type: CDataType.CHARACTER_UPDATE, subtype: 1, content: buf})
    };
}

function buildTransformUpdateMsg(id: number, bcId: number, transform: Matrix3, position: Vector3) {
    let buf = Buffer.allocUnsafe(48);
    let j = 0;
    for (let i = 0; i < 9; ++i) {
        j = writeInt32Float(buf, transform.m[i], j);
    }
    j = writeInt32Float(buf, position.x, j);
    j = writeInt32Float(buf, position.y, j);
    j = writeInt32Float(buf, position.z, j);

    let content = buildCommonData({
        idType: 0x00, bcId,
        type: CDataType.TRANSFORM_UPDATE,
        subtype: 1,
        content: buf
    });

    return { id1: id, id2: id, type: Opcode.MSG_COMMON, content }
}

function buildUserInitMsgs(id: number, user: User): MessageArray {
    let bcId = user.bcId;
    let ujContent = userJoinedContent(bcId, user.name, user.avatar);
    let msgs: MessageArray = [
        {id1: user.id, id2: id, type: Opcode.SMSG_USER_JOINED, content: ujContent}
    ];

    if (user.position) {
        msgs.push({id1: id, id2: id, bcId, position: user.position});

        if (user.transform)
            msgs.push(buildTransformUpdateMsg(id, bcId, user.transform, user.position));
    }

    if (user.characterData)
        msgs.push(buildCharUpdateMsg(id, bcId, user.characterData));

    return msgs;
}

function buildChatSendMsg(id: number, bcId: number, content: string): GeneralMsg {
    let buf = Buffer.allocUnsafe(Buffer.byteLength(content, "utf8") + 1);
    writeString(buf, content, 0);
    let data = buildCommonData({idType: 0x00, bcId, type: CDataType.CHAT_SEND, subtype: 0, content: buf});
    return {id1: id, id2: id, type: Opcode.MSG_COMMON, content: data}
}

function userJoinedContent(bcId: number, name: string, avatar: string) {
    let aLength = Buffer.byteLength(avatar, "utf8");
    let nLength = Buffer.byteLength(name, "utf8");
    let buf = Buffer.allocUnsafe(8 + aLength + nLength + 2);
    
    let n = writeBcId(buf, 0, bcId, 0);
    n = writeBcId(buf, 0, bcId, n);
    n = writeString(buf, avatar, n);
    n = writeString(buf, name, n);
    return buf;
}

function userLeftContent(bcId: number) {
    let buf = Buffer.allocUnsafe(4);
    writeBcId(buf, 0x00, bcId, 0);
    return buf;
}

function userCountContent(count: number) {
    return Buffer.from([0x01, 0x00, 0x00, 0x00, count]);
}

async function processGeneralMsg(state: State, ss: SocketState, data: Buffer, i: number): Promise<number> {
    // Check if data is too small
    if (data.length - i < 17) {
        Log.verbose(`Invalid data received from id ${ss.id}`);
        return i;
    }

    // Parse header
    let id1 = data.readUint32LE(i + 4);
    let id2 = data.readUint32LE(i + 8);
    let type = data.readUint32LE(i + 12);
    let dataLength = data.readUint8(i + 16);

    let contentEnd = i + 17 + dataLength;
    if (dataLength < 1 || contentEnd > data.length) {
        Log.verbose(`Invalid data received from id ${ss.id}`);
        return i;
    }

    let content = data.subarray(i + 17, contentEnd);
    i = contentEnd;

    if (type in Opcode)
        Log.verbose(`Opcode ${Opcode[type]}`);

    switch (type) {

    case Opcode.CMSG_NEW_USER: {
        if (ss.id in state.users)
            return i;

        let res = readStrings(content, 2);
        if (res.length < 2) break;

        let [name, avatar] = res;
        if (BanList.isNameBanned(name)) {
            Log.verbose(`Rejecting new user ${name}, name has been banned`);
            ss.socket.destroy();
            return i;
        }

        let bcId = await state.generateBcId();
        let user = state.users[ss.id] = new User(ss, name, avatar, bcId);
        state.emit("newUser", user);
        
        const joinMsg = `${name} has joined the server`;
        Log.info(joinMsg);
        Log.verbose(`Avatar: ${avatar}, broadcast id: ${bcId}`);

        let bcIdBuf = Buffer.allocUnsafe(4);
        writeBcId(bcIdBuf, 0, bcId, 0);

        let reply: MessageArray = [
            {id1: 0, id2: ss.id, type: Opcode.SMSG_CLIENT_ID, content: Buffer.from([0x00, 0x00, 0x00, ss.id])},
            {id1: ss.id, id2: ss.id, type: Opcode.SMSG_UNNAMED_1, content: Buffer.from([0x01])}, // ???
            {id1: ss.id, id2: ss.id, type: Opcode.SMSG_USER_JOINED, content: userJoinedContent(bcId, name, avatar)},
            {id1: ss.id, id2: ss.id, type: Opcode.SMSG_BROADCAST_ID, content: bcIdBuf}
        ];

        // Welcome message
        if (welcomeMsg)
            reply.push(...BureauUtils.buildSystemChatMsg(ss.id, welcomeMsg));

        const userCount = state.getUserCount();
        ss.write(reply);
        state.broadcast(user => {
            var content = [
                {id1: 0, id2: user.id, type: Opcode.SMSG_USER_COUNT, content: userCountContent(userCount)}
            ];

            if (Config.isEnabled("USER_ANNOUNCE"))
                content.push(...BureauUtils.buildSystemChatMsg(user.id, joinMsg, true));

            return content;
        });

        break;
    }

    case Opcode.MSG_COMMON: {
        let idType = content.readUint16LE(0);
        let bcId = content.readUint16LE(2);
        let type_ = content.readUInt32LE(4);
        let subtype = content.readUint8(8);

        // not sure if this is the right way to name it
        const isServerRequest = (idType == 0xFFFF && bcId == 0xF1D8);
        const bcIdDiffer = (type_ == CDataType.PRIVATE_CHAT);

        let user: User | undefined = state.users[ss.id];
        if (idType == 0) {
            // Check if user has this broadcast ID
            if (!bcIdDiffer && user?.bcId != bcId)
                break;
        }
        else if (!isServerRequest)
            break;

        if (type_ == CDataType.APPL_SPECIFIC) {
            // Seems to have an extra byte for some reason?
            // Content: 2 strings, and another bcId value at the end
            let args = readStrings(content.subarray(10), 2);
            if (args.length != 2) break;
            state.emit("applSpecific", args);
        }
        else {
            // All other types must be user-specific
            if (isServerRequest) break;
            let cData = content.subarray(9);

            switch (type_) {
            case CDataType.NAME_CHANGE: {
                const [newName] = readStrings(cData, 1);
                if (!newName) return i;

                const oldName = user.name;
                user.name = newName;
                user.emit("nameChange");
                Log.info(`${oldName} changed their name to ${user.name}`);
                break;
            }

            case CDataType.AVATAR_CHANGE: {
                const [newAvatar] = readStrings(cData, 1);
                if (!newAvatar) return i;

                user.avatar = newAvatar;
                user.emit("avatarChange");
                Log.info(`${user.name} changed their avatar to ${user.avatar}`);
                break;
            }

            case CDataType.TRANSFORM_UPDATE: {
                if (cData.length != 48) {
                    Log.verbose("Invalid transform data");
                    return i;
                }

                if (!user.transform) user.transform = new Matrix3;
                let m = user.transform.m;
                for (let i = 0; i < 9; ++i) {
                    m[i] = readInt32Float(cData, i * 4);
                }
                readPosition(cData, 36, user);
                
                user.emit("transformUpdate");
                user.emit("positionUpdate");
                break;
            }

            case CDataType.CHARACTER_UPDATE: {
                const [cd] = readStrings(cData, 1);
                if (!cd) return i;

                user.characterData = cd;
                user.emit("characterUpdate");
                break;
            }

            case CDataType.CHAT_SEND: {
                let [ message ] = readStrings(cData, 1);
                if (!message) return i;

                if (state.listenerCount("chatSend")) {
                    // Create an object for the event handlers to modify
                    let detail = { id: ss.id, message };
                    state.emit("chatSend", detail);
                    message = detail.message;
                }

                Log.info(`[CHAT] ${message}`);
                break;
            }

            case CDataType.VOICE_STATE: {
                let value = cData.readUint8(5);
                if (value == 2)
                    Log.verbose("voice disabled");
                else if (value == 1)
                    Log.verbose("voice enabled");
                break;
            }
            
            case CDataType.UNNAMED_1:
                break;
            
            case CDataType.PRIVATE_CHAT: {
                const idType = cData.readUint16LE(0);
                const fromBcId = cData.readUint16LE(2);
                let [message] = readStrings(cData.subarray(4), 1);

                if (!message || idType != 0x00 || fromBcId != user?.bcId)
                    return i;
                
                if (state.listenerCount("privateChat")) {
                    let detail = { from: fromBcId, to: bcId, message };
                    state.emit("privateChat", detail);
                    message = detail.message;
                }
                
                if (Config.isEnabled("LOG_PRIVATE_CHAT")) {
                    if (message.startsWith("%%"))
                        Log.verbose(`[PCHAT] ${message}`);
                    else
                        Log.info(`[PCHAT] ${message}`);
                }

                break;
            }
            
            default: // Unrecognized type, don't do anything
                Log.verbose(`Unrecognized common data type ${type_}`);
                return i;

            }
        }

        switch (subtype) {
        case 0:
        case 1:
            // Broadcast to other clients
            state.broadcast(other => {
                if (other.id == ss.id) return;
                if (type_ == CDataType.TRANSFORM_UPDATE) {
                    let msgs = auraCheck(user!, other);
                    if (msgs) return msgs;
                }

                if (idType != 0xFFFF && !other.auras.has(bcId))
                    return;

                return [{id1: other.id, id2: other.id, type: Opcode.MSG_COMMON, content}];
            });
            break;

        case 2:
        case 3: {
            if (bcIdDiffer) {
                // Message is meant to be sent to another user
                // Find user with the specified broadcast id
                for (const id_ in state.users) {
                    const id = +id_;
                    const user = state.users[id];
                    if (user.bcId == bcId)
                        user.ss.write([{id1: id, id2: id, type: Opcode.MSG_COMMON, content}]);
                }
            }
            else {
                // Message should be echoed back
                ss.write([{id1: ss.id, id2: ss.id, type: Opcode.MSG_COMMON, content}]);
            }
            break;
        }
        
        case 4:
            // Don't do anything(?)
            break;

        default:
            Log.verbose(`Unrecognized common data subtype ${subtype}`);
            break;

        }

        if (ss.timeout)
            clearTimeout(ss.timeout);

        ss.timeout = setTimeout(() => ss.socket.destroy(), userTimeout);
        break;
    }

    case Opcode.CMSG_STATE_CHANGE: {
        if (!(ss.id in state.users)) break;

        let value = content.readUint8();
        if (value in UserState) {
            let user = state.users[ss.id];
            user.state = value;
            user.emit("stateChange");
            Log.verbose(`${user.name}'s state changed to ${UserState[value]}`);
        }
        else
            Log.verbose(`Unknown user state ${value}`);

        break;
    }

    default:
        Log.verbose(`Unknown opcode ${type}, content ${content}`);
        break;
    
    }

    return i;
}

function readPosition(data: Buffer, offset: number, user: User) {
    let x = readInt32Float(data, offset);
    let y = readInt32Float(data, offset + 4);
    let z = readInt32Float(data, offset + 8);
    if (!user.position) user.position = new Vector3;
    user.position.set(x, y, z);
}

function processPosUpdate(state: State, ss: SocketState, data: Buffer, i: number): number {
    if (data.length - i != 27 || !(ss.id in state.users)) {
        Log.verbose(`Invalid data received from id ${ss.id}`);
        return i;
    }

    let id1 = data.readUint32LE(i + 4);
    let id2 = data.readUint8(i + 8); // weird (1 byte)
    let idType = data.readUint16LE(i + 9);
    let bcId = data.readUint16LE(i + 11);

    // Check IDs
    let user = state.users[ss.id];
    if (id1 != ss.id || id2 != ss.id || idType != 0 || bcId != user.bcId) {
        Log.verbose("User IDs mismatch");
        return i;
    }

    readPosition(data, 13, user);
    user.emit("positionUpdate");
    updateUserPosition(state, user);
    
    return i + 27;
}

function auraCheck(user: User, other: User) {
    let bcId = user.bcId;
    if (!auraRadius || user.isUserWithinRadius(other, auraRadius)) {
        if (!other.auras.has(bcId)) {
            other.auras.add(bcId);
            user.auras.add(other.bcId);
            // Send user init data to both of them
            user.ss.write(buildUserInitMsgs(user.id, other));
            return buildUserInitMsgs(other.id, user);
        }
    }
    else if (other.auras.has(bcId)) {
        other.auras.delete(bcId);
        user.auras.delete(other.bcId);
        user.ss.write([
            {id1: user.id, id2: user.id, type: Opcode.SMSG_USER_LEFT, content: userLeftContent(other.bcId)}
        ]);
        return [{id1: other.id, id2: other.id, type: Opcode.SMSG_USER_LEFT, content: userLeftContent(bcId)}];
    }
}

function updateUserPosition(state: State, user: User) {
    let { bcId, position } = user;
    if (!position) return;

    state.broadcast(other => {
        if (other.id == user.id) return;
        if (other.auras.has(bcId))
            return [{id1: other.id, id2: other.id, bcId, position: position!}];
    });
}

function updateUserTransform(state: State, user: User) {
    let { bcId, position, transform } = user;
    if (!position || !transform) return;

    state.broadcast(other => {
        if (other.id == user.id) return;
        let msgs = auraCheck(user, other);
        if (msgs) return msgs;
        
        if (other.auras.has(bcId))
            return [ buildTransformUpdateMsg(other.id, bcId, transform!, position!) ];
    });
}

async function processRequest(state: State, ss: SocketState, data: Buffer) {
    if (!ss.saidHello) {
        // First packet must always be the hello packet
        if (data.compare(CLIENT_HELLO) == 0) {
            Log.verbose("Client HELLO");
            ss.saidHello = true;
            // Reply with hello + user id
            let res = Buffer.allocUnsafe(SERVER_HELLO_PREFIX.length + 1);
            let n = bufcpy(res, SERVER_HELLO_PREFIX, 0);
            res.writeUint8(ss.id, n);

            ss.socket.write(res);
            ss.timeout = setTimeout(() => ss.socket.destroy(), userTimeout);
        }
        else ss.socket.destroy();
        return;
    }

    // Each request can have multiple messages
    for (let i = 0; i < data.length;) {
        // Check if data is too small
        if (data.length - i < 4) {
            Log.verbose(`Invalid data received from id ${ss.id}`);
            return;
        }

        let type = data.readUint32LE(i);
        if (type in SectionType)
            Log.verbose(`Section type ${SectionType[type]}`);

        let prev = i;
        switch (type) {

        case SectionType.GENERAL_MSG:
            i = await processGeneralMsg(state, ss, data, i);
            break;

        case SectionType.POSITION_UPDATE:
            i = processPosUpdate(state, ss, data, i);
            break;
        
        default:
            Log.verbose(`Unknown section type ${type}`);
            break;

        }
        
        // i will be the same if the section was invalid
        if (prev == i) break;
    }
}

export const Protocol = {
    Opcode,
    init,
    buildPacket,
    buildCommonData,
    buildCharUpdateMsg,
    buildTransformUpdateMsg,
    buildUserInitMsgs,
    buildChatSendMsg,
    processRequest,
    userCountContent,
    userJoinedContent,
    userLeftContent,
    updateUserPosition,
    updateUserTransform
}