import { Log } from ".";
import readline from "node:readline";
import { stdin, stdout } from 'node:process';

const CTRL_C = new Uint8Array([0x03]);

type ReplCommands = {[key: string]: (state: any, args: string[]) => void};
type ReplAliases = {[key: string]: string};

export class Repl {
    commands: ReplCommands;
    commandAliases: ReplAliases;
    commandList: string[];

    constructor(commands: ReplCommands, commandAliases: ReplAliases, commandList: string[]) {
        this.commands = commands;
        this.commandAliases = commandAliases;
        this.commandList = commandList;
    }

    private parseCommandLine(state: any, line: string) {
        if (!line) return;
        let [name, ...args] = line.split(" ");
        name = name.toLowerCase();

        if (name in this.commandAliases)
            name = this.commandAliases[name];

        if (name in this.commands)
            this.commands[name](state, args);
        else
            Log.error(`Invalid command: ${name}`);
    }

    private completer(line: string) {
        line = line.toLowerCase();
        let hits = this.commandList.filter(v => v.startsWith(line));
        return [hits, line];
    }

    start(state: any) {
        let prompted = false;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.on("data", key => {
            if (key.compare(CTRL_C) == 0) {
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
            completer: this.completer.bind(this)
        })
        .on("line", line => {
            if (prompted) {
                // Resume first to let last messages go on top
                Log.resume();

                // Process command
                this.parseCommandLine(state, line);

                // Wait for next user input
                prompted = false;
            }
        });
    }
}