# OpenBureau WLS Guide
## Usage
You can start a WLS server by simply running:
```
npm run wls
```
## Configuration
By default, without any configuration, the WLS server is only suitable for usage from the local machine. The following config properties are important for running a public server: `BUREAU_HOST`, `BUREAU_PORT_START`, `MAX_BUREAU`, `MAX_WORLD` and `WORLD_WHITELIST`.

Configuration can be done through environment variables or a `config-wls.txt` file which follows the same format as the `config.txt` file used by the bureau (see [Config.md](./Config.md) for more info)

Full list of properties:
- `PORT`: The server's port. Default: 5125
- `HOST`: The server's host. If in doubt, leave as default. Default: 0.0.0.0
- `MAX_CONN`: Maximum number of concurrent connections (only applies to the WLS server). Default: 100
- `IPC_SOCKET`: The IPC socket path. Can be a path to a UNIX socket, a named pipe (on Windows), or a TCP port.
    - External TCP connections are always blocked.
- `CLIENT_TIMEOUT`: How long it takes before the server disconnects from a client that's not responding. Value is in milliseconds. Default: 10000
- `NO_REPL`: Disable the REPL. Value is a boolean.
- `NO_MULTI`: Disallow multiple connections from the same client. Value is a boolean.
- `BUREAU_HOST`: The bureau's host address, which the client will connect to. Default: `127.0.0.1`
    - NOTE: This must be set to an actual address on public servers. For example, setting it to example.com will cause the client to connect to example.com:5126, example.com:5127, etc.
- `BUREAU_PORT_START`: Start of the bureaus's port range. Default: 5126
    - `MAX_BUREAU` defines the end of this range. e.g: By default, `MAX_BUREAU` is set to 32, which means the ports will range from 5126 to 5158.
- `BUREAU_TIMEOUT`: How long it takes before the server stops an inactive bureau. Value is in milliseconds. Default: 30000
- `MAX_BUREAU`: Maximum number of concurrent bureaus. Default: 32
- `MAX_WORLD`: Maximum number of concurrent worlds. Default: 16
- `WORLD_WHITELIST`: Whitelist of worlds allowed to be assigned to bureaus. Value is a JSON string array.
    - Example: `["SAPARi COAST MIL.", "SAPARi PARK MIL."]`
    - **WARNING**: This property should always be set on public servers. Without a world whitelist, attackers can fill up a server very quickly and/or make it inaccessible with specially crafted requests.
- `LOG_TAG`: Tag to append onto log messages. Useful for identifying log messages from multiple servers using the same output.
- `VERBOSE`: Enable verbose logging. Value is a boolean.

Additionally, any properties set through environment variables will be forwarded to bureau processes spawned by the WLS server (except for a few which are always overridden)