import { Log } from ".";

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

export const Utils = {
    pluralize,
    pluralNoun,
    helpCmd
}