import net from "node:net";
import { MessageArray, Protocol } from "."

export class SocketState {
    socket: net.Socket;
    id: number;
    saidHello = false;
    
    constructor(socket: net.Socket, id: number) {
        this.socket = socket;
        this.id = id;
    }

    write(buf: Buffer): boolean;
    write(messages: MessageArray): boolean;
    write(arg: Buffer | MessageArray): boolean {
        let buf: Buffer;
        if (arg instanceof Buffer)
            buf = arg;
        else
            buf = Protocol.buildPacket(arg);

        return this.socket.write(buf);
    }
}