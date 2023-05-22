import net from "node:net";
import fs from "node:fs";
import assert from "assert";
import { Log, Config, Repl, BanList } from "./core";
import { Protocol, State, SocketState, SYSTEM_BCID, replCmds, replCmdAliases, replCmdList, ipcHandlers } from "./bureau";
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
    }

    var server = net.createServer(listener)
        .on("listening", () => Log.info(`Listening on port ${PORT}`))
        .on("error", (err: NodeJS.ErrnoException) => {
            if (err.code == "EADDRINUSE") {
                Log.error("Port " + PORT + " is in use, retrying in 5 seconds...");
                setTimeout(() => {
                    server.close();
                    server.listen(PORT, HOST);
                }, 5000);
            }
            else Log.error(err);
       })
       .listen(PORT, HOST);
    
    server.maxConnections = MAX_CONN;

    nodeCleanup(cleanup);
    
    if (!Config.isEnabled("NO_REPL")) {
        // Reserve system bcId for system messages
        state.bcIdSet.add(SYSTEM_BCID);
        const repl = new Repl(replCmds, replCmdAliases, replCmdList);
        repl.start(state);
    }

    if (process.send)
        process.send("ready");
}

function cleanup() {
    Log.resume(); // Might have been paused during an active prompt

    // For unix sockets
    if (IPC_SOCKET && fs.existsSync(IPC_SOCKET))
        fs.unlinkSync(IPC_SOCKET);
    
    BanList.save();

    Log.info("Goodbye!");
}

main();