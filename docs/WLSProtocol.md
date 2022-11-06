# VSCP WLS Documentation
The VSCP WLS acts as a gateway to VSCP bureaus. Its main function is to direct clients to bureaus depending on the world the user is playing on, while also acting as a load balancer.

As its only purpose is to redirect clients to the destination, the protocol only consists of a single request and response:

## Request
The request is sent by the client upon connecting to the WLS server. The data is a null-terminated string that looks like this:

```
f,192.168.1.14,SAPARi COAST MIL.,85.000000,-71.610001,85.000000,1,example.com,5126
```

The string has 9 fields, each separated by a comma:
| Field | Description |
| --- | --- |
| Type | Always set to `f` |
| Client IP | Local IP address of the client |
| World Name | Name of the world |
| X | Position x |
| Y | Position y |
| Z | Position z |
| Busy Flag | `1` - fully occupied, other values/empty - not full. Used to request the WLS server to send another bureau if one was full. |
| Busy Hostname | The address of the busy bureau |
| Busy Port | The port of the busy bureau |


## Response
After receiving the request, the server will send a null-terminated string back to the client. The response has 3 variants:

- Return the address of a bureau
```
f,0,example.com,5126
```

The string has 4 fields, each separated by a comma:
| Field | Description |
| --- | --- |
| Type | Always set to `f` |
| Ack. | Always set to `0` |
| Hostname | The address of the bureau |
| Port | The port of the bureau |

- Return a URL
```
f,1,example.com
```

The string has 3 fields, each separated by a comma:
| Field | Description |
| --- | --- |
| Type | Always set to `f` |
| Ack. | Always set to `1` |
| Address | The URL to be opened in Netscape |

- In case of an error
```
f,9
```

The string has 2 fields, each separated by a comma:
| Field | Description |
| --- | --- |
| Type | Always set to `f` |
| Ack. | Always set to `9` |

After receiving the response, the client should disconnect from the WLS server and start connecting to the bureau, open the specified URL with Netscape or alert to the user that the server cannot be connected to.

# References
Request/response fields details are from the Community Place Bureau User's Manual.

# License
This documentation is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)