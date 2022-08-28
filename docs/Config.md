# Config
Configuration can be done through text files or environment variables. There are two files that can be used to configure the server: `config.txt` and `banlist.txt`

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
- `NO_REPL`: Disable the REPL. Value is a boolean.
- `AURA_RADIUS`: The radius of the aura, or how far away each user can be seen. Set to 0 to disable the aura system. Default: 0.
- `VERBOSE`: Enable verbose logging. Value is a boolean.