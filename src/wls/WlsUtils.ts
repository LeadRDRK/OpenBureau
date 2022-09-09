import { State } from ".";
import { Log, BanList } from "../core";

function banIp(state: State, ip: string) {
    // Add to banlist
    BanList.addIp(ip);

    // Kick all users with the IP
    for (const i in state.bureaus) {
        const bureau = state.bureaus[i];
        for (const j in bureau.users) {
            const user = bureau.users[j];
            if (user.address == ip)
                bureau.ipc.write({type: "kick", content: user.id});
        }
    }

    Log.info(`${ip} has been banned`);
}

function banName(state: State, name: string) {
    BanList.addName(name);

    // Kick all users that have the name
    for (const i in state.bureaus) {
        const bureau = state.bureaus[i];
        for (const j in bureau.users) {
            const user = bureau.users[j];
            if (user.name == name)
                bureau.ipc.write({type: "kick", content: user.id});
        }
    }

    Log.info(`${name} has been banned`);
}

export const WlsUtils = {
    banIp,
    banName
}