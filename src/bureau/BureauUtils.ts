import { User, State, Protocol } from ".";
import { Log, BanList } from "../core";

export const SYSTEM_BCID = 0x0202;

function teleport(user1: User, user2: User) {
    if (!user1.position || !user2.position) {
        Log.error("Teleport failed: user has no position data");
        return false;
    }

    user1.position = user2.position;
    user1.position.y += 0x100;
    user1.ss.write([{id1: user1.id, id2: user1.id, bcId: user1.bcId, position: user1.position}]);
    Log.info(`Teleported ${user1.name} to ${user2.name}`);
    return true;
}

function banIp(state: State, ip: string) {
    // Add to banlist
    BanList.addIp(ip);

    // Disconnect all sockets with the IP
    for (const id in state.sockets) {
        let socket = state.sockets[id];
        let a = socket.address();
        if ("address" in a && a.address == ip)
            socket.destroy();
    }

    Log.info(`${ip} has been banned`);
}

function banName(state: State, name: string) {
    BanList.addName(name);

    // Kick all users that have the name
    for (const id in state.users) {
        let user = state.users[id];
        if (user.name == name)
            user.ss.socket.destroy();
    }

    Log.info(`${name} has been banned`);
}

function sendSystemChatMsg(state: State, msg: string) {
    const chatMsg = `[System] ${msg}`;
    state.broadcast(user => {
        let ujContent = Protocol.userJoinedContent(SYSTEM_BCID, "System", "avtwrl/01cat.wrl");
        return [
            {id1: user.id, id2: user.id, type: Protocol.Opcode.SMSG_USER_JOINED, content: ujContent},
            Protocol.buildChatSendMsg(user.id, SYSTEM_BCID, chatMsg)
        ]
    });
    Log.info(`[CHAT] ${chatMsg}`);
}

export const BureauUtils = {
    teleport,
    banIp,
    banName,
    sendSystemChatMsg
}