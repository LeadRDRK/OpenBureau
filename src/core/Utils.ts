import { Log, BanList } from ".";

function pluralize(count: number, noun: string, suffix = "s") {
    return `${count} ${noun}${count !== 1 ? suffix : ""}`;
}

function pluralNoun(count: number) {
    return count > 1 ? "are" : "is";
}

function helpCmd(cmdHelp: {[key: string]: string}, cmdAliases: {[key: string]: string}, cmdList: string[]) {
    return (_: any, args: string[]) => {
        if (args.length) {
            let name = args[0];
            if (name in cmdAliases)
                name = cmdAliases[name];

            if (name in cmdHelp)
                Log.info(`${name}: ${cmdHelp[name]}`);
            else
                Log.info(`No help entry found for "${name}"`);
        }
        else
            Log.info(`Known commands: ${cmdList.join(", ")}\nUse "help <command>" to get specific info`);
    }
}

function bannedIpsCmd() {
    let ips = BanList.getBannedIps();
    if (ips.size == 0) {
        Log.info("There are no banned IPs");
        return;
    }

    let output = "Banned IPs:";
    ips.forEach(value => output += `\n    ${value}`);
    Log.info(output);
}

function bannedNamesCmd() {
    let ips = BanList.getBannedNames();
    if (ips.size == 0) {
        Log.info("There are no banned names");
        return;
    }

    let output = "Banned names:";
    ips.forEach(value => output += `\n    ${value}`);
    Log.info(output);
}

function unbanCmd(_: any, args: string[]) {
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
}

function unbanNameCmd(_: any, args: string[]) {
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
}

export const Utils = {
    pluralize,
    pluralNoun,
    helpCmd,
    bannedIpsCmd,
    bannedNamesCmd,
    unbanCmd,
    unbanNameCmd
}