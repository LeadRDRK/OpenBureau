import { Log } from "../core";
import { Plugin, State } from ".";

interface PluginWithState extends Plugin {
    enabled: boolean;
}

function isPlugin(v: any): v is Plugin {
    return (typeof v == "object" && v.init instanceof Function && v.uninit instanceof Function);
}

var plugins: {[key: string]: PluginWithState} = {};

function add(name: string): boolean {
    if (name.match(/\/|\\/)) {
        Log.info(`PM: Invalid plugin name "${name}"`);
        return false;
    }

    var plugin = require(`../plugins/${name}`);
    if (!isPlugin(plugin)) {
        Log.info(`PM: "${name}" is an invalid plugin module`);
        return false;
    }

    plugins[name] = plugin as PluginWithState;
    return true;
}

async function enable(name: string, state: State): Promise<boolean> {
    var plugin = plugins[name];
    if (!plugin) {
        Log.error(`PM: Plugin "${name}" does not exist`);
        return false;
    }
    if (plugin.enabled) return true;

    if (await plugin.init(state)) {
        Log.info(`PM: Plugin "${name}" initialized`);
        plugin.enabled = true;
    }
    else {
        Log.error(`PM: Failed to initialize "${name}"`);
        return false;
    }
    
    return true;
}

function disable(name: string) {
    var plugin = plugins[name];
    if (!plugin) {
        Log.error(`PM: Plugin "${name}" does not exist`);
        return;
    }
    if (!plugin.enabled) return;

    plugin.uninit();
    Log.info(`PM: Plugin "${name}" uninitialized`);

    plugin.enabled = false;
}

function getPluginNames() {
    return Object.keys(plugins);
}

function getPluginStates() {
    return Object.entries(plugins).map(([name, plugin]) => {
        return {name, enabled: plugin.enabled}
    });
}

export const PluginManager = {
    add,
    enable,
    disable,
    getPluginNames,
    getPluginStates
};