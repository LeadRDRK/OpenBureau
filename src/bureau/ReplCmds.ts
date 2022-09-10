import { State, BureauUtils } from ".";
import { Log, Utils, UserState } from "../core";
import net from "node:net";

export const replCmds: {[key: string]: (state: State, args: string[]) => void} = {
    stop() {
        process.exit();
    },

    users(state: State) {
        let count = state.getUserCount();
        if (count == 0) {
            Log.info("There are no users in the server");
            return;
        }

        let output: {[key: number]: any} = {};  
        for (const id in state.users) {
            let user = state.users[id];
            output[id] = {
                Name: user.name,
                State: UserState[user.state]
            };
        }

        Log.info(`There ${Utils.pluralNoun(count)} currently ${Utils.pluralize(count, "user")}:`);
        console.table(output);
    },

    getids(state: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'getids'");
            return;
        }
        let name = args.join(" ");
        let ids: number[] = [];
        for (const id in state.users) {
            if (state.users[id].name == name)
                ids.push(+id);
        }
        if (ids.length)
            Log.info(`User IDs for ${name}: ${ids.join(" ")}`);
        else
            Log.info(`No users with the name ${name} was found`);
    },

    chat(state: State, args: string[]) {
        BureauUtils.sendSystemChatMsg(state, args.join(" "));
    },

    teleport(state: State, args: string[]) {
        if (args.length < 2) {
            Log.error("Insufficient arguments to 'teleport'");
            return;
        }
        const id1 = +args[0];
        const id2 = +args[1];
        if (!(id1 in state.users && id2 in state.users)) {
            Log.error("Invalid user IDs provided");
            return;
        }
        
        BureauUtils.teleport(state.users[id1], state.users[id2]);
    },

    kick(state: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'kick'");
            return;
        }

        let id = +args[0];
        if (!(id in state.users)) {
            Log.error("Invalid user ID provided");
            return;
        }

        let user = state.users[id];
        user.ss.socket.destroy();
        Log.info(`Kicking ${user.name}`);
    },

    ban(state: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'ban'");
            return;
        }
        let ip = args[0];
        if (!net.isIPv4(ip)) {
            // Get user ip
            let id = +ip;
            if (!(id in state.users)) {
                Log.error("Invalid user ID provided");
                return;
            }
            let socket = state.users[id].ss.socket;
            let a = socket.address();
            if ("address" in a)
                ip = a.address;
            else {
                Log.error("Failed to get user's IP address");
                return;
            }
        }
        
        BureauUtils.banIp(state, ip);
    },

    unban: Utils.unbanCmd,

    banname(state: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'banname'");
            return;
        }
        BureauUtils.banName(state, args[0]);
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
    users: "Get the list of users currently in the server",
    getids: "Get the IDs of users with the specified username. Usage: getids <name>",
    chat: "Send a system chat message. Usage: chat <message>",
    teleport: "Teleport a player to another. Usage: teleport <id1> <id2>",
    kick: "Kick a player. Usage: kick <id>",
    ban: "Ban a player by their IP address. Usage: ban <user id or ip address>",
    unban: "Unban an IP address. Usage: unban <ip address>",
    banname: "Ban all players with the specified name. Usage: banname <name>",
    unbanname: "Unban all players with the specified name. Usage: unbanname <name>",
    bannedips: "Get the list of banned IPs",
    bannednames: "Get the list of banned names"
}

replCmds.help = Utils.helpCmd(cmdHelp, replCmdAliases, replCmdList);