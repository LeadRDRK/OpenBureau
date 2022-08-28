import { Log } from ".";
import fs from "node:fs";

let entries: {[key: string]: string} = {};

function loadFile() {
    try {
        let content = fs.readFileSync("config.txt", {encoding: "utf8"});
        let lines = content.split("\n");
        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i];
            if (line.length == 0) continue;

            const [key, value] = line.split("=");
            if (!value) {
                Log.warn(`Invalid config line: ${line}`);
                continue;
            }
            entries[key] = value;
        }
        Log.verbose("config.txt loaded");
    }
    catch {
        Log.verbose("Failed to read config.txt");
    }
}

function get(name: string): string | undefined
function get(name: string, defaultValue: string): string
function get(name: string, defaultValue?: string): string | undefined {
    const value = (name in process.env) ? process.env[name] : entries[name];
    return value ? value : defaultValue;
}

let enabledCache: {[key: string]: boolean} = {};
function isEnabled(key: string): boolean {
    if (!(key in enabledCache)) {
        let v = get(key)?.toLowerCase();
        return enabledCache[key] = (v == "1" || v == "true");
    }
    return enabledCache[key];
}

export const Config = {
    loadFile,
    get,
    isEnabled
}