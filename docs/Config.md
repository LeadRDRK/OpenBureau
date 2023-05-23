# Config
Configuration can be done through text files or environment variables. There are two files that can be used to configure the server: `config.txt` and `banlist.txt`

Config properties set in the environment variables have higher privileges than those in the config file, so they can be used to override and quickly test out config values before actually writing them to a file.

## config.txt
Syntax: Each property's name and value are separated by a `=`, each entry is separated by a newline.

Example:
```
PORT=1337
MAX_CONN=20
NO_REPL=true
VERBOSE=1
```

## banlist.txt
Syntax: If an entry starts with `i:`, it is an IP address. If an entry starts with `n:`, it is a name. Each entry is separated by a newline.

Example:
```
i:203.0.113.254
i:198.51.100.3
n:SapariHater
n:I HATE SAPARI!!!!
```

## Properties
- `PORT`: The server's port. Default: 5126
- `HOST`: The server's host. If in doubt, leave as default. Default: 0.0.0.0
- `MAX_CONN`: Maximum number of concurrent connections. Default: 256. Setting it to a value higher than 256 is useless as it is limited by design.
- `IPC_SOCKET`: The IPC socket path. Can be a path to a UNIX socket, a named pipe (on Windows), or a TCP port.
    - External TCP connections are always blocked.
- `NO_REPL`: Disable the REPL. Value is a boolean.
- `NO_MULTI`: Disallow multiple connections from the same client. Value is a boolean.
- `AURA_RADIUS`: The radius of the aura, or how far away can a user be seen by other users. Set to 0 to disable the aura system. Default: 0.
- `USER_TIMEOUT`: How long it takes before the server disconnects from a client if they don't identify themselves, in milliseconds. Default: 10000
- `LOG_PRIVATE_CHAT`: Log private chat messages. Value is a boolean. If `VERBOSE` is enabled, special message values will also be logged.
- `LOG_TAG`: Tag to append onto log messages. Useful for identifying log messages from multiple servers using the same output.
- `WELCOME_MSG`: Message to send to users when they first join the server. Does not contain the system chat prefix. Newlines can be included in the message by using `\n`
- `SYSTEM_CHAT_PREFIX`: The system chat prefix when sending system messages using the `chat` command. Default: `[System] `
- `WORLD_NAME`: This property is set by the WLS server when launching a new Bureau to allow it to identify which world it belongs to. Intended for use in plugins.
- `PLUGINS`: A JSON array of strings containing the names of the modules to load from the `plugins` directory.
- `VERBOSE`: Enable verbose logging. Value is a boolean.