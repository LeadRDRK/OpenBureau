import { Log } from ".";
import fs from "node:fs";

let bannedIps = new Set<string>;
let bannedNames = new Set<string>;

function loadFile() {
    try {
        let content = fs.readFileSync("banlist.txt", {encoding: "utf8"});
        let lines = content.split("\n");
        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i];
            if (line.length == 0) continue;

            const value = line.slice(2);
            if (line.startsWith("i:"))
                bannedIps.add(value);
            else if (line.startsWith("n:"))
                bannedNames.add(value);
            else
                Log.warn(`Invalid ban list entry: ${line}`);
        }
        Log.verbose("banlist.txt loaded");
    }
    catch {
        Log.verbose("Failed to read banlist.txt");
    }
}

function addIp(address: string) {
    bannedIps.add(address);
}

function addName(name: string) {
    bannedNames.add(name);
}

function deleteIp(address: string) {
    bannedIps.delete(address);
}

function deleteName(name: string) {
    bannedNames.delete(name);
}

function isIpBanned(address: string) {
    return bannedIps.has(address);
}

function isNameBanned(name: string) {
    return bannedNames.has(name);
}

function getBannedIps() {
    return bannedIps;
}

function getBannedNames() {
    return bannedNames;
}

function writeFile() {
    Log.info("Saving ban list to banlist.txt");
    let content = "";
    bannedIps.forEach(value => content += `i:${value}\n`);
    bannedNames.forEach(value => content += `n:${value}\n`);
    fs.writeFileSync("banlist.txt", content, {encoding: "utf8"});
}

export const BanList = {
    loadFile,
    addIp,
    addName,
    deleteIp,
    deleteName,
    isIpBanned,
    isNameBanned,
    getBannedIps,
    getBannedNames,
    writeFile
}