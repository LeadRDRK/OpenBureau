# VSCP WLS Documentation
The VSCP WLS acts as a gateway to VSCP bureaus. Its main function is to direct clients to bureaus depending on the world the user is playing on, while also acting as a load balancer.

As its only purpose is to redirect clients to the destination, the protocol only consists of a single request and response:

## Request
The request is sent by the client upon connecting to the WLS server. The data is a null-terminated string that looks like this:

```
f,192.168.1.14,SAPARi COAST MIL.,85.000000,-71.610001,85.000000,,,
```

The string seems to have to 9 sections, each separated by a comma:
- The first value is always `f`.
- The second value is the client's local IP address.
- The third value is the world's name.
- The next 3 values seem to be the character's spawn position.
- The last 3 values are unused.

## Response
After receiving the request, the server will send a null-terminated string back to the client, which looks like this:

```
f,0,example.com,5126
```

The string contains 4 sections, each separated by a comma:
- The first value is always `f`.
- The second value is always `0`.
- The third value is the bureau's address.
- The last value is the bureau's port.

After receiving the response, the client should disconnect from the WLS server and begin connecting to the Bureau.

# License
This documentation is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)