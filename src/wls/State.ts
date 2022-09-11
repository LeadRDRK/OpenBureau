import { IpcClient, IpcServer, IpcData } from "../ipc";
import { spawn } from "node:child_process";
import { IdSet, Config, Log, BanList } from "../core";
import { env as parentEnv, platform } from "node:process";
import { Bureau } from ".";
import assert from "node:assert";

let configLoaded = false;

let BUREAU_PORT_START: number;
let BUREAU_TIMEOUT: number;
let MAX_BUREAU: number;
let MAX_WORLD: number;

function getIpcSocketPath(id: number) {
    if (platform == "win32")
        return `\\\\.\\pipe\\bureau${id}`;
    else // literally everything else can use unix sockets
        return `/tmp/bureau${id}`;
}

export class State {
    bureaus: {[key: number]: Bureau} = {};
    worlds: {[key: string]: Set<Bureau>} = {};
    idSet = new IdSet;
    ipc?: IpcServer;
    ipSet?: Set<string>;

    constructor() {
        if (configLoaded) return;

        BUREAU_PORT_START = +Config.get("BUREAU_PORT_START", "5126");
        BUREAU_TIMEOUT = +Config.get("BUREAU_TIMEOUT", "30000");
        MAX_BUREAU = +Config.get("MAX_BUREAU", "32");
        MAX_WORLD = +Config.get("MAX_WORLD", "16");

        assert(Number.isInteger(BUREAU_PORT_START) && BUREAU_PORT_START > 0, "Invalid bureau port start");
        assert(BUREAU_TIMEOUT >= 0, "Invalid bureau timeout value");
        assert(Number.isInteger(MAX_BUREAU) && MAX_BUREAU >= 0, "Invalid max bureau count");
        assert(Number.isInteger(MAX_WORLD) && MAX_WORLD >= 0, "Invalid max world count");

        configLoaded = true;
    }

    newBureau(world: string): Promise<Bureau> {
        return new Promise((resolve, reject) => {
            if (this.getBureauCount() >= MAX_BUREAU) {
                Log.warn(`Bureau limit reached, cannot create new bureau for ${world}`);
                reject();
                return;
            }

            if (!(world in this.worlds) && this.getWorldCount() >= MAX_WORLD) {
                Log.warn(`World limit reached, cannot create new bureau for ${world}`);
                reject();
                return;
            }

            const id = this.getNewId();
            const port = BUREAU_PORT_START + id;
            const socketPath = getIpcSocketPath(id);
            const process = spawn("node", ["dist/index-bureau.js"], {
                env: {
                    ...parentEnv,
                    PORT: port.toString(),
                    IPC_SOCKET: socketPath,
                    NO_BANLIST: "1",
                    LOG_TAG: id.toString(),
                    NO_REPL: "1"
                },
                stdio: ["ignore", "pipe", "inherit", "ipc"]
            })
            .once("spawn", () => {
                Log.info(`Spawned a new bureau for ${world}, port ${port}, id ${id}`);
                
                const t = setTimeout(() => {
                    process.kill("SIGTERM");
                    reject("Bureau process did not respond, terminating");
                }, 5000);

                process.on("message", msg => {
                    if (msg != "ready") return;

                    clearTimeout(t);
                    const ipc = new IpcClient(socketPath);

                    ipc.socket.once("connect", async () => {
                        const res = await ipc.sendRequest({type: "getMaxConn"});
                        if (res.type == "failed") {
                            process.kill("SIGTERM");
                            reject("Failed get max connection count from bureau, terminating");
                            return;
                        }
                        const maxConn = res.content;

                        const bureau = { id, world, port, users: {}, maxConn, process, ipc, socketPath, listen: true, isFull: false };
                        this.bureaus[id] = bureau;
                        
                        if (world in this.worlds)
                            this.worlds[world].add(bureau);
                        else
                            this.worlds[world] = new Set([bureau]);
                        
                        process.stdout!.on("data", (data: Buffer) => {
                            if (!bureau.listen) return;
                            Log.write(data.subarray(0, data.length - 1).toString("utf8"));
                        });

                        ipc.write({
                            type: "listen",
                            content: ["newUser", "removeUser", "userCount", "nameChange", "avatarChange", "stateChange", "serverFull"]
                        });
                        ipc.on("data", this.bureauDataListener.bind(this, bureau));
                        
                        if (this.ipc) {
                            this.ipc.broadcastIf({type: "newBureau", content: { id, world, port, ipcSocket: socketPath }}, client => client.listening.newBureau);
                            this.ipc.broadcastIf({type: "bureauCount", content: this.getBureauCount()}, client => client.listening.bureauCount);
                        }

                        this.setBureauTimeout(bureau);
                        resolve(bureau);
                    })
                    .once("error", () => {
                        process.kill("SIGTERM");
                        reject("Failed to connect to bureau's IPC socket, terminating");
                    });
                });
            })
            .once("error", err => {
                Log.error(err);
                reject("Failed to spawn a new bureau");
            })
            .once("exit", () => this.removeBureau(id));
        });
    }

    private setBureauTimeout(bureau: Bureau) {
        if (bureau.timeout) clearTimeout(bureau.timeout);
        bureau.timeout = setTimeout(() => {
            delete bureau.timeout;
            bureau.process.kill("SIGTERM");
        }, BUREAU_TIMEOUT)
    }

    private bureauDataListener(bureau: Bureau, data: IpcData) {
        // Ignore tagged messages
        if (data.tag) return;

        const content = data.content;
        switch (data.type) {
        case "newUser":
            if (BanList.isNameBanned(content.name)) {
                Log.verbose(`Rejecting new user ${content.name}, name has been banned`);
                bureau.ipc.write({type: "kick", content: content.id});
                return;
            }
            bureau.users[content.id] = content;
            if (this.ipSet) this.ipSet.add(content.address);
            break;

        case "removeUser":
            const id = content;
            if (this.ipSet) this.ipSet.delete(bureau.users[id].address);
            delete bureau.users[id];
            break;

        case "userCount":
            if (content == 0)
                this.setBureauTimeout(bureau);
            else if (bureau.timeout)
                clearTimeout(bureau.timeout);

            break;

        case "nameChange":
            if (BanList.isNameBanned(content.newName)) {
                Log.verbose(`Kicking player for changing name to ${content.newName}, name has been banned`);
                bureau.ipc.write({type: "kick", content: content.id});
                return;
            }

            if (content.id in bureau.users)
                bureau.users[content.id].name = content.name;

            break;

        case "avatarChange":
            if (content.id in bureau.users)
                bureau.users[content.id].avatar = content.avatar;

            break;

        case "stateChange":
            if (content.id in bureau.users)
                bureau.users[content.id].state = content.state;

            break;

        case "serverFull":
            bureau.isFull = content;
            break;

        }
    }

    getBureauCount() {
        return Object.keys(this.bureaus).length;
    }

    getWorldCount() {
        return Object.keys(this.worlds).length;
    }

    getNewId() {
        return this.idSet.add().last;
    }

    removeBureau(id: number) {
        if (!(id in this.bureaus)) return;
        const bureau = this.bureaus[id];
        const world = bureau.world;

        clearTimeout(bureau.timeout);
        bureau.ipc.socket.destroy();
        bureau.process.kill("SIGTERM");
        this.idSet.delete(bureau.id);
        this.worlds[world].delete(bureau);
        delete this.bureaus[id];

        if (this.worlds[world].size == 0)
            delete this.worlds[world];

        if (this.ipc) {
            this.ipc.broadcastIf({type: "removeBureau", content: id}, client => client.listening.removeBureau);
            this.ipc.broadcastIf({type: "bureauCount", content: this.getBureauCount()}, client => client.listening.bureauCount);
        }
        
        Log.info(`Removed bureau ${id}`);
    }

    async pickBureau(world: string) {
        if (world in this.worlds) {
            for (const bureau of this.worlds[world]) {
                if (!bureau.isFull) {
                    this.setBureauTimeout(bureau);
                    return bureau;
                }
            }
        }
        return await this.newBureau(world);
    }
}