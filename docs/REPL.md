# REPL
By default, the server opens a REPL/interactive shell in the current terminal's stdin which can be used to run commands.

It can be turned off by setting the `NO_REPL` property in the config.

## Usage
When you first input a key through the console, the following message will show up along with a prompt:
```
-- paused --
>
```
The server is now waiting for your input and the log has been paused. Run a command or hit enter without anything in the prompt to resume the log.

## Commands
- help: Get information about a command. Usage: `help [command]`. Can be run without any arguments to display a list of commands.
- stop: Stop the server.
- users: Get the list of users currently in the server.
- getids: Get the IDs of users with the specified username. Usage: `getids <name>`
- chat: Send a system chat message. Usage: `chat <message>`
- teleport: Teleport a player to another. Usage: `teleport <id1> <id2>`
- kick: Kick a player. Usage: `kick <id>`
- ban: Ban a player by their IP address. Usage: `ban <user id or ip address>`
- unban: Unban an IP address. Usage: `unban <ip address>`
- banname: Ban all players with the specified name. Usage: `banname <name>`
- unbanname: Unban all players with the specified name. Usage: `unbanname <name>`
- bannedips: Get the list of banned IPs.
- bannednames: Get the list of banned names.

## Examples
- Teleport a player named "Finger" to another player named "Walter"
    - Use the `users` command to show the list of users:
    ```
    > users
    [INFO] There are currently 4 users:
        ID  Name            State
        0   Finger          ACTIVE
        1   Walter          ACTIVE
        2   SomeoneElse     SLEEP
        3   Foobar          ACTIVE
    ```
    - Run the `teleport` command with their IDs:
    ```
    > teleport 0 1
    [INFO] Teleported Finger to Walter
    ```
    - Tip: You can also use `getids` to get their IDs.
- Kick a user
    - Use the `users` command to show the list of users.
    - Check the ID of the user you want to kick (we'll use 5 as an example ID here), then run:
    ```
    > kick 5
    [INFO] Kicking User
    [INFO] User has left the server
    ```
- Ban an IP address
    ```
    > ban 198.51.100.3
    [INFO] 198.51.100.3 has been banned
    ```
- Ban all users with a specific name
    ```
    > banname Foobar
    [INFO] Foobar has been banned
    ```
- Send a system message
    ```
    chat Hello world!
    ```
    - "\[System] Hello world!" will show up in the users's chat box.