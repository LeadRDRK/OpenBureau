import { State, Protocol, UserState, BureauUtils } from ".";
import { Log, Utils, BanList } from "../core";
import net from "node:net";

export const SYSTEM_BCID = 0x0202;

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

        let output = `There ${Utils.pluralNoun(count)} currently ${Utils.pluralize(count, "user")}:\n` +
                     "    ID\tName\t\tState";
        for (const id in state.users) {
            let user = state.users[id];
            output += `\n    ${user.id}\t${user.name}\t\t${UserState[user.state]}`;
        }
        Log.info(output);
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
        const chatMsg = `[System] ${args.join(" ")}`;
        state.broadcast(user => {
            let ujContent = Protocol.userJoinedContent(SYSTEM_BCID, "System", "avtwrl/01cat.wrl");
            return [
                {id1: user.id, id2: user.id, type: Protocol.Opcode.SMSG_USER_JOINED, content: ujContent},
                Protocol.buildChatSendMsg(user.id, SYSTEM_BCID, chatMsg)
            ]
        });
        Log.info(`[CHAT] ${chatMsg}`);
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

    unban(_: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'unban'");
            return;
        }
        let ip = args[0];
        if (!BanList.isIpBanned(ip)) {
            Log.info(`${ip} is not in the ban list`);
            return;
        }
        BanList.deleteIp(ip);
        Log.info(`${ip} has been unbanned`);
    },

    banname(state: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'banname'");
            return;
        }
        BureauUtils.banName(state, args[0]);
    },

    unbanname(_: State, args: string[]) {
        if (args.length < 1) {
            Log.error("Insufficient arguments to 'unbanname'");
            return;
        }
        let name = args[0];
        if (!BanList.isNameBanned(name)) {
            Log.info(`${name} is not in the ban list`);
            return;
        }
        BanList.deleteName(name);
        Log.info(`${name} has been unbanned`);
    },

    bannedips() {
        let ips = BanList.getBannedIps();
        if (ips.size == 0) {
            Log.info("There are no banned IPs");
            return;
        }

        let output = "Banned IPs:";
        ips.forEach(value => output += `\n    ${value}`);
        Log.info(output);
    },

    bannednames() {
        let ips = BanList.getBannedNames();
        if (ips.size == 0) {
            Log.info("There are no banned names");
            return;
        }

        let output = "Banned names:";
        ips.forEach(value => output += `\n    ${value}`);
        Log.info(output);
    }
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