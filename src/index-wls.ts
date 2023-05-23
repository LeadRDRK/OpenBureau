import net from "node:net";
import fs from "node:fs";
import assert from "assert";
import { Log, Config, BanList, Repl, Utils } from "./core";
import { State, replCmds, replCmdAliases, replCmdList, ipcHandlers } from "./wls";
import { IpcServer } from "./ipc";
import nodeCleanup from "node-cleanup";

let IPC_SOCKET: string | undefined;
let CLIENT_TIMEOUT: number;
let BUREAU_HOST: string;
let WORLD_WHITELIST: Set<string> | undefined;

let state: State;

function listener(socket: net.Socket) {
    let a = socket.address();
    let address = ("address" in a) ? a.address : "<unknown>";
    if (BanList.isIpBanned(address)) {
        Log.verbose(`Rejecting connection from ${address}, IP has been banned`);
        socket.destroy();
        return;
    }
    if (Config.isEnabled("NO_MULTI")) {
        if (state.ipSet!.has(address)) {
            Log.verbose(`Rejecting connection from ${address}, multiple connections are not allowed`);
            socket.destroy();
            return;
        }
    }

    Log.verbose(`Incoming connection from ${address}`);
    socket.on("data", async data => {
        const str = data.subarray(0, data.length - 1).toString("utf8");
        const split = str.split(",");
        const [f, localIp, world] = split;

        if (split.length != 9 || f != "f" || !net.isIPv4(localIp)) {
            Log.verbose(`Invalid data received from ${address}`);
            socket.destroy();
            return;
        }

        Log.verbose(`${address} => ${world}`);
        if (WORLD_WHITELIST && !WORLD_WHITELIST.has(world)) {
            Log.verbose(`${world} is not in the world whitelist, rejecting`);
            socket.destroy();
            return;
        }

        try {
            const bureau = await state.pickBureau(world);
            socket.write(`f,0,${BUREAU_HOST},${bureau.port}\0`);
        }
        catch (err) {
            if (err) Log.error(err);
            socket.write("f,9\0");
        }
        socket.destroy();
    })
    .on("error", Log.error)
    .on("close", () => Log.verbose(`${address} disconnected`));

    setTimeout(() => {
        if (!socket.closed) {
            Log.verbose(`Closing connection from ${address}, client did not send data`);
            socket.destroy();
        }
    }, CLIENT_TIMEOUT);
}

function main() {
    Config.loadFile("config-wls.txt");
    BanList.loadFile();

    Log.init();
    Log.info(`OpenBureau WLS v${process.env.npm_package_version}`);

    const PORT = +Config.get("PORT", "5125");
    const HOST = Config.get("HOST", "0.0.0.0");
    const MAX_CONN = +Config.get("MAX_CONN", "100");
    BUREAU_HOST = Config.get("BUREAU_HOST", "127.0.0.1");
    CLIENT_TIMEOUT = +Config.get("CLIENT_TIMEOUT", "10000");
    IPC_SOCKET = Config.get("IPC_SOCKET");
    
    assert(Number.isInteger(PORT), "Invalid port provided");
    assert(Number.isInteger(MAX_CONN) && MAX_CONN >= 0, "Invalid max connection count");
    assert(CLIENT_TIMEOUT >= 0, "Invalid client timeout value");

    const worldWlArr = Config.getArray("WORLD_WHITELIST");
    if (worldWlArr)
        WORLD_WHITELIST = new Set(worldWlArr);

    state = new State;

    if (Config.isEnabled("NO_MULTI"))
        state.ipSet = new Set<string>;

    if (IPC_SOCKET) {
        state.ipc = new IpcServer(ipcHandlers, state);
        state.ipc.init(IPC_SOCKET, () => Log.info(`IPC socket listening at ${IPC_SOCKET}`));
    }

    var server = Utils.createTCPServer(PORT, HOST, listener);
    server.maxConnections = MAX_CONN;
    
    nodeCleanup(cleanup);

    if (!Config.isEnabled("NO_REPL")) {
        const repl = new Repl(replCmds, replCmdAliases, replCmdList);
        repl.start(state);
    }

    if (process.send)
        process.send("ready");
}

function cleanup() {
    Log.resume(); // Might have been paused during an active prompt

    for (const id in state.bureaus) {
        state.bureaus[id].process.kill("SIGTERM");
    }

    // For unix sockets
    if (IPC_SOCKET && fs.existsSync(IPC_SOCKET))
        fs.unlinkSync(IPC_SOCKET);
    
    BanList.save();

    Log.info("Goodbye!");
};

main();