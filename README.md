# OpenBureau
<img align="right" height="200px" src="docs/logo-icon.png">
<br>

OpenBureau is an open source server implementation and documentation of the Virtual Society Server-Client Protocol, as used by the Community Place Browser and Bureau. This project exists to preserve and develop upon the VSCP and its uses, as well as providing a modern, cross-platform server software.

No disassembly was done during the development of this project; everything was made possible with manual packet decoding, time and dedication.

<br>
<p align="right"><b>Logo by <a href="https://twitter.com/dark_twter">Poly</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</b></p>

# Features
- Near faithful implementation of the VSCP.
- Written in TypeScript, can be run on anything that Node.js supports.
- No hardcoded users limit.
- No aura/user distance limit.
- Easy configuration through text files and environment variables.
- Console commands including kick, ban, etc.
- Bureau WLS support.

# TODO
- Properly interpret the player's position and rotation values.
- Implement the Aura system.

# Installation
Requirements:
- [node.js](https://nodejs.org) v16 or later

You must install it before doing anything described here!

First, download the source code for the latest version of OpenBureau on the [Releases page](https://github.com/LeadRDRK/OpenBureau/releases). After that, run the following command inside the source folder to install the dependencies:
```
npm install
```
When it's done, build the TypeScript code with:
```
npm run build
```
The resulting JavaScript code will now be available in a folder named "dist". If you're on Windows, you can just run `build.bat` and it will do everything automatically for you. There is also a `start.bat` script to run the server effortlessly.

# Usage
To start the server, use the following command:
```
npm run bureau
```
By default, you should now have a Bureau running on port 5126!

# Config
Configuration can be done with text files or environment variables. See [`docs/Config.md`](docs/Config.md) for more details.

# REPL
By default, the server opens a REPL/interactive shell in the current terminal's stdin. It can be used to run commands.

When you first input a key through the console, you will see a message like this:
```
-- paused --
```
This indicates that the log has been paused and the server is waiting for your input. Run a command or hit enter with nothing in the prompt to resume the log.

You can run the `help` command to see a list of commands or check [`docs/REPL.md`](docs/REPL.md) for more details.

# WLS
See [`docs/WLS.md`](docs/WLS.md) for a guide on how to setup and run a WLS server.

# Documentation
The protocol documentation is available in [`docs/Protocol.md`](docs/Protocol.md) and [`docs/WLSProtocol.md`](docs/WLSProtocol.md)

# License
The source code of the server implementation is licensed under [Apache License 2.0](LICENSE), and all of the documentation in [`/docs`](docs) are licensed under the [Creative Common Attribution-ShareAlike 4.0 license](https://creativecommons.org/licenses/by-sa/4.0).