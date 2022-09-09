import { State, WlsUtils } from ".";
import { Log, Utils, BanList } from "../core";
import net from "node:net";

export const replCmds: {[key: string]: (state: State, args: string[]) => void} = {
    stop() {
        process.exit();
    },

    stopbureau(state: State, args: string[]) {
        let id = +args[0];
        if (!(id in state.bureaus)) {
            Log.error("Invalid bureau ID");
            return;
        }

        state.bureaus[id].process.kill("SIGTERM");
    },

    bureaus(state: State) {
        let count = state.getBureauCount();
        if (count == 0) {
            Log.info("There are no bureaus currently running");
            return;
        }
        
        let output: {[key: number]: any} = {};  
        for (const id in state.bureaus) {
            let bureau = state.bureaus[id];
            output[id] = {
                World: bureau.world,
                Port: bureau.port,
                Users: Object.keys(bureau.users).length
            }
        }

        Log.info(`There ${Utils.pluralNoun(count)} currently ${Utils.pluralize(count, "bureau")}:`);
        console.table(output);
    },

    worlds(state: State) {
        let count = state.getWorldCount();
        if (count == 0) {
            Log.info("There are no worlds currently running");
            return;
        }

        let output: any[] = [];
        for (const name in state.worlds) {
            let bureaus = state.worlds[name];
            output.push({
                World: name,
                Bureaus: bureaus.size
            });
        }

        Log.info(`There ${Utils.pluralNoun(count)} currently ${Utils.pluralize(count, "world")}:`);
        console.table(output);
    },

    users(state: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'users'");
            return;
        }

        let id = +args[0];
        if (!(id in state.bureaus)) {
            Log.error("Invalid bureau ID");
            return;
        }

        let users = state.bureaus[id].users;
        let count = Object.keys(users).length;
        if (count == 0) {
            Log.info(`There are no users in bureau ${id}`);
            return;
        }

        let output: {[key: number]: any} = {};  
        for (const id in users) {
            let user = users[id];
            output[id] = {
                Name: user.name
            };
        }

        Log.info(`There ${Utils.pluralNoun(count)} currently ${Utils.pluralize(count, "user")} in bureau ${id}:`);
        console.table(output);
    },

    chat(state: State, args: string[]) {
        const id = +args[0];
        const msg = args.slice(1).join(" ");

        if (!(id in state.bureaus)) {
            Log.error("Invalid bureau ID provided");
            return;
        }

        const bureau = state.bureaus[id];
        bureau.ipc.write({type: "chat", content: msg});
    },

    teleport(state: State, args: string[]) {
        if (args.length < 3) {
            Log.error("Insufficient arguments to 'teleport'");
            return;
        }

        const bureauId = +args[0];
        const id1 = +args[1];
        const id2 = +args[2];

        if (!(bureauId in state.bureaus)) {
            Log.error("Invalid bureau ID provided");
            return;
        }

        const bureau = state.bureaus[bureauId];

        if (!(id1 in bureau.users) || !(id2 in bureau.users)) {
            Log.error("Invalid user ID provided");
            return;
        }

        bureau.ipc.write({type: "teleport", content: {id1, id2}});
    },

    kick(state: State, args: string[]) {
        if (args.length < 2) {
            Log.error("Insufficient arguments to 'kick'");
            return;
        }

        const bureauId = +args[0];
        const userId = +args[1];

        if (!(bureauId in state.bureaus)) {
            Log.error("Invalid bureau ID provided");
            return;
        }

        const bureau = state.bureaus[bureauId];

        if (!(userId in bureau.users)) {
            Log.error("Invalid user ID provided");
            return;
        }

        bureau.ipc.write({type: "kick", content: userId});
    },

    ban(state: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'ban'");
            return;
        }
        let ip = args[0];
        if (!net.isIPv4(ip)) {
            Log.error("Invalid IP address provided");
            return;
        }
        
        WlsUtils.banIp(state, ip);
    },

    unban: Utils.unbanCmd,

    banname(state: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'banname'");
            return;
        }
        WlsUtils.banName(state, args[0]);
    },

    unbanname: Utils.unbanNameCmd,

    bannedips: Utils.bannedIpsCmd,
    bannednames: Utils.bannedNamesCmd
}

export const replCmdAliases: {[key: string]: string} = {
    // alias: "actualcommand"
    tp: "teleport",
    exit: "stop",
    quit: "stop",
    close: "stop",
    banip: "ban",
    unbanip: "unban"
}

export const replCmdList = Object.keys(replCmds).concat(Object.keys(replCmdAliases));

const cmdHelp: {[key: string]: string} = {
    help: "Get information about a command. Usage: help [command]",
    stop: "Stop the server",
    stopbureau: "Stop a bureau. Usage: stopbureau <bureau id>",
    bureaus: "Get the list of bureaus currently running",
    worlds: "Get the list of worlds currently running",
    users: "Get the list of users currently in a bureau. Usage: users <bureau id>",
    chat: "Send a system chat message to a bureau. Usage: chat <bureau id> <message>",
    teleport: "Teleport a player to another. Usage: teleport <bureau id> <id1> <id2>",
    kick: "Kick a player. Usage: kick <bureau id> <user id>",
    ban: "Ban an IP address. Usage: ban <ip address>",
    unban: "Unban an IP address. Usage: unban <ip address>",
    banname: "Ban all players with the specified name. Usage: banname <name>",
    unbanname: "Unban all players with the specified name. Usage: unbanname <name>",
    bannedips: "Get the list of banned IPs",
    bannednames: "Get the list of banned names"
}

replCmds.help = Utils.helpCmd(cmdHelp, replCmdAliases, replCmdList);