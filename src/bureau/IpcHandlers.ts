import { IpcData, IpcHandlers, IpcError } from "../ipc";
import { State, BureauUtils } from ".";
import { Log, BanList, Config } from "../core";

function cloneUser(user: {[key: string]: any}) {
    let clone: {[key: string]: any} = {};
    for (const i in user) {
        if (i == "ss" || i == "rotation") continue;

        if (i == "auras")
            clone[i] = Array.from(user[i]);
        else
            clone[i] = user[i];
    }
    return clone;
}

export const ipcHandlers: IpcHandlers = {
    getServerType() {
        return {type: "serverType", content: "bureau"};
    },

    getUsers(state: State, name: any) {
        let clone: {[key: number]: {[key: string]: any}} = {};
        let hasName = (typeof name == "string");
        // Shallow clone the users object, removing the socket state and rotation data
        for (const i in state.users) {
            const user = state.users[i];
            if (hasName && user.name != name) continue;

            clone[i] = cloneUser(user);
        }
        return {type: "users", content: clone};
    },

    getUser(state: State, id: any) {
        let res: IpcData = {type: "user", content: null};
        if (id in state.users)
            res.content = cloneUser(state.users[id]);

        return res;
    },

    getUserCount(state: State) {
        return {type: "userCount", content: state.getUserCount()};
    },

    getMaxConn() {
        return {type: "maxConn", content: +Config.get("MAX_CONN", "256")};
    },

    chat(state: State, msg: any) {
        if (typeof msg != "string")
            return {type: "error", content: IpcError.INVALID_ARGS};
        
        BureauUtils.sendSystemChatMsg(state, msg);
    },

    teleport(state: State, content: any) {
        let res: IpcData = {type: "teleportRes", content: false};
        if (typeof content == "object" && "id1" in content && "id2" in content) {
            const id1 = content.id1,
                  id2 = content.id2;

            if (!(id1 in state.users && id2 in state.users))
                return res;
            
            res.content = BureauUtils.teleport(state.users[id1], state.users[id2]);
        }
        return res;
    },

    kick(state: State, id: any) {
        let res: IpcData = {type: "kickRes", content: false};
        if (id in state.users) {
            let user = state.users[id];
            user.ss.socket.destroy();
            res.content = true;
            Log.info(`Kicking ${user.name}`);
        }
        return res;
    },

    ban(state: State, content: any) {
        let res: IpcData = {type: "banRes", content: false};
        let ip: string;
        if (typeof content == "string")
            ip = content;
        else {
            const id = +content;
            if (!(id in state.users))
                return res;

            let socket = state.users[id].ss.socket;
            let a = socket.address();
            if ("address" in a)
                ip = a.address;
            else
                return res;
        }

        BureauUtils.banIp(state, ip);
    },

    unban(_: State, ip: any) {
        if (typeof ip != "string") return;
        BanList.deleteIp(ip);
        Log.info(`${ip} has been unbanned`);
    },

    banName(state: State, name: any) {
        if (typeof name != "string") return;
        BureauUtils.banName(state, name);
    },

    unbanName(_: State, name: any) {
        if (typeof name != "string") return;
        BanList.deleteName(name);
        Log.info(`${name} has been unbanned`);
    },

    getBannedIps() {
        let ips = BanList.getBannedIps();
        return {type: "bannedIps", content: Array.from(ips)};
    },

    getBannedNames() {
        let names = BanList.getBannedNames();
        return {type: "bannedNames", content: Array.from(names)};
    },

    isServerFull(state: State) {
        return {type: "serverFull", content: state.isFull};
    },

    stop() {
        process.exit();
    }
}