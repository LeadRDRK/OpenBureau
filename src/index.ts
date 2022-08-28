import net from "node:net";
import { Log, Config, Protocol, State, SocketState, Repl, BanList } from "./core";
import nodeCleanup from "node-cleanup";

const USER_TIMEOUT = 5000;

let state: State;

async function listener(socket: net.Socket) {
    let a = socket.address();
    let address = ("address" in a) ? a.address : "<unknown>";
    if (BanList.isIpBanned(address)) {
        socket.destroy();
        return;
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
    Config.loadFile();
    BanList.loadFile();

    const PORT = +Config.get("PORT", "5126");
    const HOST = Config.get("HOST", "0.0.0.0");
    const MAX_CONN = +Config.get("MAX_CONN", "256"); // Limited to 256 by design

    if (!Number.isInteger(PORT)) {
        Log.error("Invalid port provided. Aborting");
        return;
    }

    if (!Number.isInteger(MAX_CONN)) {
        Log.error("Invalid max connection count. Aborting");
        return;
    }

    state = new State;
    Protocol.init();

    // TypeScript is somehow missing the definitions for keepAlive...
    // @ts-ignore
    net.createServer({keepAlive: true}, listener)
       .on("listening", () => Log.info(`Listening on port ${PORT}`))
       .on("error", Log.error)
       .listen(PORT, HOST)
       .maxConnections = MAX_CONN;
    
    if (!Config.isEnabled("NO_REPL"))
        Repl.start(state);
}

nodeCleanup(() => {
    Log.resume(); // Might have been paused during an active prompt
    BanList.writeFile();
    Log.info("Goodbye!");
});

main();