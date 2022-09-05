import net from "node:net";
import fs from "node:fs";
import { Log, Config, Repl } from "./core";
import { Protocol, State, SocketState, BanList, SYSTEM_BCID, replCmds, replCmdAliases, replCmdList } from "./bureau";
import { IPCServer } from "./ipc";
import nodeCleanup from "node-cleanup";

let USER_TIMEOUT: number;
let IPC_SOCKET: string | undefined;

let state: State;
let ipSet: Set<string>;

async function listener(socket: net.Socket) {
    let a = socket.address();
    let address = ("address" in a) ? a.address : "<unknown>";
    if (BanList.isIpBanned(address)) {
        Log.verbose(`Rejecting connection from ${address}, IP has been banned`);
        socket.destroy();
        return;
    }
    if (Config.isEnabled("NO_MULTI")) {
        if (ipSet!.has(address)) {
            Log.verbose(`Rejecting connection from ${address}, multiple connections are not allowed`);
            socket.destroy();
            return;
        }
        ipSet!.add(address);
    }

    let id = state.getNewId();
    if (id == -1) {
        // User limit reached
        Log.verbose(`Rejecting connection from ${address}, user limit reached`);
        socket.destroy();
        return;
    }
    let ss = new SocketState(socket, id);

    Log.verbose(`Incoming connection from ${address}, id ${id}`);
    state.sockets[id] = socket;

    socket.on("data", data => Protocol.processRequest(state, ss, data))
    .on("error", Log.error)
    .on("close", () => {
        state.removeUser(id);
        if (Config.isEnabled("NO_MULTI")) ipSet!.delete(address);
        Log.verbose(`${address} disconnected`);
    });

    // Disconnect if client doesn't identify themselves
    setTimeout(() => {
        if (!socket.closed && !(id in state.users)) {
            Log.verbose(`Closing connection from ${address}, user did not identify`);
            socket.destroy();
        }
    }, USER_TIMEOUT);
}

function main() {
    Log.info(`OpenBureau v${process.env.npm_package_version}`);

    // Load config files
    Config.loadFile("config.txt");
    BanList.loadFile();

    const PORT = +Config.get("PORT", "5126");
    const HOST = Config.get("HOST", "0.0.0.0");
    const MAX_CONN = +Config.get("MAX_CONN", "256"); // Limited to 256 by design
    USER_TIMEOUT = +Config.get("USER_TIMEOUT", "10000");
    IPC_SOCKET = Config.get("IPC_SOCKET");
    
    if (Config.isEnabled("NO_MULTI"))
        ipSet = new Set<string>;

    if (!Number.isInteger(PORT)) {
        Log.error("Invalid port provided. Aborting");
        return;
    }

    if (!Number.isInteger(MAX_CONN)) {
        Log.error("Invalid max connection count. Aborting");
        return;
    }

    if (!Number.isInteger(USER_TIMEOUT)) {
        Log.error("Invalid user timeout value. Aborting");
        return;
    }

    state = new State;
    Protocol.init();

    if (IPC_SOCKET) {
        state.ipc = new IPCServer({});
        state.ipc.init(IPC_SOCKET, () => Log.info(`IPC socket listening at ${IPC_SOCKET}`));
    }

    // TypeScript is somehow missing the definitions for keepAlive...
    // @ts-ignore
    net.createServer({keepAlive: true}, listener)
       .on("listening", () => Log.info(`Listening on port ${PORT}`))
       .on("error", Log.error)
       .listen(PORT, HOST)
       .maxConnections = MAX_CONN;
    
    if (!Config.isEnabled("NO_REPL")) {
        // Reserve system bcId for system messages
        state.bcIdSet.add(SYSTEM_BCID);
        const repl = new Repl(replCmds, replCmdAliases, replCmdList);
        repl.start(state);
    }
}

nodeCleanup(() => {
    Log.resume(); // Might have been paused during an active prompt

    // For unix sockets
    if (IPC_SOCKET && fs.existsSync(IPC_SOCKET))
        fs.unlinkSync(IPC_SOCKET);
    
    BanList.writeFile();

    Log.info("Goodbye!");
});

main();