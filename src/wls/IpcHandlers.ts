import { IpcData, IpcHandlers } from "../ipc";
import { State, Bureau, WlsUtils } from ".";
import { Log, BanList } from "../core";

function cloneBureau(bureau: Bureau) {
    let clone: {[key: string]: any} = {
        id: bureau.id,
        world: bureau.world,
        port: bureau.port,
        users: bureau.users,
        maxConn: bureau.maxConn,
        isFull: bureau.isFull,
        ipcSocket: bureau.socketPath
    }
    return clone;
}

export const ipcHandlers: IpcHandlers = {
    getServerType() {
        return {type: "serverType", content: "wls"};
    },

    getBureaus(state: State, world: any) {
        let clone: {[key: number]: {[key: string]: any}} = {};
        let hasWorld = (typeof world == "string");

        for (const i in state.bureaus) {
            const bureau = state.bureaus[i];
            if (hasWorld && bureau.world != world) continue;

            clone[i] = cloneBureau(bureau);
        }
        return {type: "bureaus", content: clone};
    },

    getBureau(state: State, id: any) {
        let res: IpcData = {type: "bureau", content: null};
        if (id in state.bureaus)
            res.content = cloneBureau(state.bureaus[id]);
        
        return res;
    },

    getBureauCount(state: State, world: any) {
        let hasWorld = (typeof world == "string");

        let count = 0;
        for (const i in state.bureaus) {
            const bureau = state.bureaus[i];
            if (hasWorld && bureau.world != world) continue;
            ++count;
        }

        return {type: "bureauCount", content: count};
    },

    ban(state: State, ip: any) {
        if (typeof ip != "string") return;
        WlsUtils.banIp(state, ip);
    },

    unban(_: State, ip: any) {
        if (typeof ip != "string") return;
        BanList.deleteIp(ip);
        Log.info(`${ip} has been unbanned`);
    },

    banName(state: State, name: any) {
        if (typeof name != "string") return;
        WlsUtils.banName(state, name);
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

    stopBureau(state: State, id: any) {
        if (!(id in state.bureaus)) return;
        state.bureaus[id].process.kill("SIGTERM");
    },

    stop() {
        process.exit();
    }
};