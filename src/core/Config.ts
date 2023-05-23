import { Log } from ".";
import fs from "node:fs";
import assert from "node:assert";

let entries: {[key: string]: string} = {};

function loadFile(path: string) {
    try {
        let content = fs.readFileSync(path, {encoding: "utf8"});
        let lines = content.split("\n");
        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i];
            if (line.length == 0) continue;

            const index = line.indexOf("=");
            if (index == -1) {
                Log.warn(`Invalid config line: ${line}`);
                continue;
            }
            const key = line.slice(0, index),
                  value = line.slice(index + 1);
            entries[key] = value;
        }
        Log.verbose(`${path} loaded`);
    }
    catch {
        Log.verbose(`Failed to read ${path}`);
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

function getArray(name: string): any[] | undefined;
function getArray(name: string, defaultValue: any[]): any[];
function getArray(name: string, defaultValue?: any[]) {
    const value = Config.get(name);
    if (value) {
        try {
            const arr = JSON.parse(value);
            if (!Array.isArray(arr)) {
                return Log.error(`Invalid value for '${name}' (expected a JSON array)`);
            }
            return arr;
        }
        catch (e) {
            Log.error(`Failed to parse '${name}'`);
            Log.error(e);
        }
    }

    return defaultValue;
}

export const Config = {
    loadFile,
    get,
    isEnabled,
    getArray
}