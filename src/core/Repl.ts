import { State, Log, Protocol, UserState, BanList } from ".";
import readline from "node:readline/promises";
import { stdin, stdout } from 'node:process';
import net from "node:net";

const SYSTEM_BCID = 0x0202;

function pluralize(count: number, noun: string, suffix = "s") {
    return `${count} ${noun}${count !== 1 ? suffix : ""}`;
}

function pluralNoun(count: number) {
    return count > 1 ? "are" : "is";
}

let commands: {[key: string]: (state: State, args: string[]) => void} = {
    help(_: State, args: string[]) {
        if (args.length) {
            let name = args[0];
            if (name in commandAliases)
                name = commandAliases[name];

            if (name in commandHelp)
                Log.info(`${name}: ${commandHelp[name]}`);
            else
                Log.info(`No help entry found for "${name}"`);
        }
        else
            Log.info(`Known commands: ${commandList.join(", ")}\nUse "help <command>" to get specific info`);
    },

    stop(_: State, __: string[]) {
        process.exit();
    },

    users(state: State, _: string[]) {
        let count = state.getUserCount();
        if (count == 0) {
            Log.info("There are no users in the server");
            return;
        }

        let output = `There ${pluralNoun(count)} currently ${pluralize(count, "user")}:\n` +
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

        let user1 = state.users[id1];
        let user2 = state.users[id2];
        if (!user1.position || !user2.position) {
            Log.error("Teleport failed: user has no position data");
            return;
        }

        user1.position = user2.position;
        user1.position.y += 0x100;
        user1.ss.write([{id1: user1.id, id2: user1.id, bcId: user1.bcId, position: user1.position}]);
        Log.info(`Teleported ${user1.name} to ${user2.name}`);
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
        let name = args[0];
        BanList.addName(name);

        // Kick all users that have the name
        for (const id in state.users) {
            let user = state.users[id];
            if (user.name == name)
                user.ss.socket.destroy();
        }

        Log.info(`${name} has been banned`);
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

    bannedips(_: State, __: string[]) {
        let ips = BanList.getBannedIps();
        if (ips.size == 0) {
            Log.info("There are no banned IPs");
            return;
        }

        let output = "Banned IPs:";
        ips.forEach(value => output += `\n    ${value}`);
        Log.info(output);
    },

    bannednames(_: State, __: string[]) {
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
let commandList = Object.keys(commands);

let commandAliases: {[key: string]: string} = {
    // alias: "actualcommand"
    tp: "teleport",
    exit: "stop",
    quit: "stop",
    close: "stop",
    banip: "ban",
    unbanip: "unban"
}

let commandHelp: {[key: string]: string} = {
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

function parseCommandLine(state: State, line: string) {
    if (!line) return;
    let [name, ...args] = line.split(" ");
    name = name.toLowerCase();

    if (name in commandAliases)
        name = commandAliases[name];

    if (name in commands)
        commands[name](state, args);
    else
        Log.error(`Invalid command: ${name}`);
}

function completer(line: string) {
    line = line.toLowerCase();
    let hits = commandList.filter(v => v.startsWith(line));
    return [hits, line];
}

const ctrlC = new Uint8Array([0x03]);
function start(state: State) {
    // Reserve system bcId for system messages
    state.bcIdSet.add(SYSTEM_BCID);

    let prompted = false;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", key => {
        if (key.compare(ctrlC) == 0) {
            process.exit();
            return;
        }
        if (prompted) return;
        // On input, pause the log to let user enter their command
        Log.pause();
        rl.prompt();
        prompted = true;
    });

    let rl = readline.createInterface({
        input: stdin,
        output: stdout,
        completer
    })
    .on("line", line => {
        if (prompted) {
            // Resume first to let last messages go on top
            Log.resume();

            // Process command
            parseCommandLine(state, line);

            // Wait for next user input
            prompted = false;
        }
    });
}

export const Repl = {
    start
};