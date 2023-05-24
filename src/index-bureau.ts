import net from "node:net";
import fs from "node:fs";
import assert from "assert";
import { Log, Config, Repl, BanList, Utils } from "./core";
import { Protocol, State, SocketState, SYSTEM_BCID, replCmds, replCmdAliases, replCmdList, ipcHandlers, PluginManager } from "./bureau";
import { IpcServer } from "./ipc";
import nodeCleanup from "node-cleanup";

let MAX_CONN: number;
let USER_TIMEOUT: number;
let IPC_SOCKET: string | undefined;

let state: State;
let ipSet: Set<string>;

let connCount = 0;
function checkConnCount() {
    if (connCount >= MAX_CONN && !state.isFull)
        state.isFull = true;
    else if (state.isFull)
        state.isFull = false;
    else
        return;
    
    if (state.ipc)
        state.ipc.broadcastIf({type: "serverFull", content: state.isFull}, client => client.listening.serverFull);
}

function listener(socket: net.Socket) {
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
        --connCount;
        checkConnCount();

        state.removeUser(id);
        if (Config.isEnabled("NO_MULTI")) ipSet!.delete(address);
        Log.verbose(`${address} disconnected`);
    });

    ++connCount;
    checkConnCount();

    // Disconnect if client doesn't identify themselves
    setTimeout(() => {
        if (!socket.closed && !(id in state.users)) {
            Log.verbose(`Closing connection from ${address}, user did not identify`);
            socket.destroy();
        }
    }, USER_TIMEOUT);
}

function main() {
    Config.loadFile("config.txt");
    BanList.loadFile();

    Log.init();
    Log.info(`OpenBureau v${process.env.npm_package_version}`);

    const PORT = +Config.get("PORT", "5126");
    const HOST = Config.get("HOST", "0.0.0.0");
    MAX_CONN = +Config.get("MAX_CONN", "256"); // Limited to 256 by design
    USER_TIMEOUT = +Config.get("USER_TIMEOUT", "30000");
    IPC_SOCKET = Config.get("IPC_SOCKET");
    
    if (Config.isEnabled("NO_MULTI"))
        ipSet = new Set<string>;

    assert(Number.isInteger(PORT), "Invalid port provided");
    assert(Number.isInteger(MAX_CONN) && MAX_CONN >= 0, "Invalid max connection count");
    assert(USER_TIMEOUT >= 0, "Invalid user timeout value");

    state = new State;
    Protocol.init();

    if (IPC_SOCKET) {
        state.ipc = new IpcServer(ipcHandlers, state);
        state.ipc.init(IPC_SOCKET, () => Log.info(`IPC socket listening at ${IPC_SOCKET}`));
        state.initIpcEvents();
    }

    var server = Utils.createTCPServer(PORT, HOST, listener);
    server.maxConnections = MAX_CONN;

    nodeCleanup(cleanup);
    
    if (!Config.isEnabled("NO_REPL")) {
        // Reserve system bcId for system messages
        state.bcIdSet.add(SYSTEM_BCID);
        const repl = new Repl(replCmds, replCmdAliases, replCmdList);
        repl.start(state);
    }

    var plugins = Config.getArray("PLUGINS");
    if (plugins) {
        plugins.forEach(name => {
            if (typeof name != "string") return;
            PluginManager.add(name);
            PluginManager.enable(name, state);
        });
    }

    if (process.send)
        process.send("ready");
}

function cleanup() {
    Log.resume(); // Might have been paused during an active prompt

    PluginManager.getPluginNames().forEach(name => {
        PluginManager.disable(name);
    });

    // For unix sockets
    if (IPC_SOCKET && fs.existsSync(IPC_SOCKET))
        fs.unlinkSync(IPC_SOCKET);
    
    BanList.save();

    Log.info("Goodbye!");
}

main();