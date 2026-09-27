---
title: Building an electron app from scratch (Part 4)
original: https://medium.com/ingeniouslysimple/building-an-electron-app-from-scratch-part-4-5d0906897bf1?source=friends_link&sk=b2366fa6b178a87b7867cdc060aac6cf
date: 2019-10-08
---

While electron’s main node process provides a complete standard library, and npm packages are available to implement all sorts of features that your desktop app might want to implement, sometimes you’ll need to call out to a separate commandline to get the behavior you want. Perhaps you already have a significant amount of code in another language you want to reuse, or you need to call a tool that already exists, like git.

There are various ways to call out to code in other languages. The git case (and others like it) are fairly straightforward: just call the commandline with the appropriate arguments, then parse the ([ideally porcelain](https://git-scm.com/docs/git-status#Documentation/git-status.txt---porcelainltversiongt)) output to get the information you need.

Another option is to host a webserver in the process you’re calling. Pretty much any language knows how to talk HTTP, so this can be a nice language-agnostic solution. You might feel hosting a full webserver for some quick IPC is overkill, though, and hosting an open endpoint on the local machine creates some security holes that need to be closed.

In this article we’ll talk about another option: using [JSON-RPC](https://www.jsonrpc.org/specification) over [standard I/O](https://en.wikipedia.org/wiki/Standard_streams). This feels like a nice solution: JSON-RPC is a minimal specification for doing API calls over some kind of boundary, and using stdin/stdout for communication instead of HTTP is comparatively lightweight while still being completely cross-platform.

Unfortunately, it’s not all good news — some ambiguities in the JSON-RPC spec and the fact that it isn’t widely used makes it a bit trickier to get started with.

---

For this example we’ll use a couple of libraries built for VS Code (and more specifically the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) implementation). They are [vscode-jsonprc](https://www.npmjs.com/package/vscode-jsonrpc) for the node end and [StreamJsonRpc](https://github.com/microsoft/vs-streamjsonrpc) for the dotnet end respectively.

These two libraries are designed to be compatible with each other by default, which helps a lot. One problem with JSON-RPC is that the spec [doesn’t actually specify how JSON objects are transmitted over the wire](https://github.com/microsoft/vs-streamjsonrpc/blob/86e157e/doc/extensibility.md). A basic JSON-RPC implementation might just [pick an encoding](http://utf8everywhere.org/) and then chain a series of JSON objects end-to-end. While this would be perfectly valid, most existing JSON parsers are designed to operate on a single string containing a JSON object rather than having to scan through text looking for the beginning and end of each object. For many transports (such as HTTP or websockets) this isn’t a problem, since the transport itself already breaks the stream up into messages — however stdio doesn’t have any such concept baked in.

The upshot of the above is that StreamJsonRpc and vscode-jsonrpc will expect (by default) for each JSON message to be delimited by HTTP-like headers followed by a blank line and the actual JSON string. These headers can contain many different options, but the most important is the Content-Length value, which tells the library how much text to read before passing it to the JSON parser. For our purposes this just works invisibly, but it’s important to be aware of when using different libraries or languages that also implement some form of JSON-RPC.

---

Once we have the right packages installed, getting started is reasonably straightforward, despite the sparse documentation:

```
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using RedGate.Usage.Client;
using StreamJsonRpc;

namespace rgca_usage_reporting
{
    public static class Program
    {
        public static async Task Main(string[] args)
        {
            var version = Assembly.GetExecutingAssembly().GetName().Version;

            // Note that we write logs to stderr instead of stdout to avoid breaking the RPC protocol
            Console.Error.WriteLine($"Starting foo server {version}...");
            var backend = new FooServer(new FooConfig());

            // we create an rpc instance which sends messages on stdout and listens for them on stdin
            var rpc = new JsonRpc(Console.OpenStandardOutput(), Console.OpenStandardInput());

            // We can register each of the API methods to implement like this:
            rpc.AddLocalRpcMethod("reticulate-splines", new Action<string, JObject>((eventType, payload) =>
            {
                backend.ReticulateSplines(eventType, payload["splineCount"]);
            }));

            // We can also return results from some APIs
            rpc.AddLocalRpcMethod("find-waldo", new Func<string, JObject, Location>((eventType, payload) =>
            {
                return backend.GetLocation("waldo", payload["approxCoords"]);
            }));

            rpc.AddLocalRpcMethod("shutdown", new Action(() =>
            {
                // You might need a "shutdown" method to clean up any leftover resources
                Console.Error.WriteLine("Foo server shutting down...");
                backend.Dispose();
                Console.Error.WriteLine("...completed");
            }));

            // Note that we have to call StartListening() here, but it *does not block*
            rpc.StartListening();

            // We need to block here to prevent the commandline from exiting immediately
            await rpc.Completion;
        }
    }
}
```

There are some alternate ways we can set up the RPC server — for example, we could define a target object and then have the library automatically discover available methods through reflection — but using `AddLocalRpcMethod` seems like the most straightforward option and lets us control the names of the API channels much more easily.

The code to set up the client is fairly straightforward as well:

```
const rpcProcess = child_process.spawn(
    path.join("path", "to", "rpc_server.exe")
    // Any required cli arguments or spawn options can be specified here
  );

  rpcProcess.stderr.on("data", data => {
    // We use the stderr stream for logging, so just print out anything from there:
    console.log("Server process: ", data.toString());
  });

  // As before, attach the rpc protocol to the child process stdio streams
  const connection = rpc.createMessageConnection(
    new rpc.StreamMessageReader(rpcProcess.stdout),
    new rpc.StreamMessageWriter(rpcProcess.stdin)
  );

  // Define the types of the API we want to consume.
  // Since these are duplicated, you may want to generate the code for these from some common spec
  // if it becomes sufficiently complicated to keep updated.
  const reticulateSplines = new rpc.NotificationType2<string, ReticulationRequest, void>("reticulate-splines");

  // We distinguish between notifications (sent as fire-and-forget messages from the client to the server)
  // and requests (where we want to block on some result)
  const findWaldo = new rpc.RequestType2<string, SearchRequest, LocationResult>("find-waldo");

  // The shutdown method is a request with no parameters or return type
  const shutdown = new rpc.RequestType0("shutdown");

  // Note that listen() does not block - it just starts the RPC protocol
  connection.listen();

  // ...

  // While the app is active we send notifications and requests like this:
  connection.sendNotification(reticulateSplines, { splineCount: 23 });
  const location = await connection.sendRequest(findWaldo, { approxCoords: "52.228351, 0.153092" });

  // And then once we're done, we clean up any resources and end the server process:
  await connection.sendRequest(shutdown);
  rpcProcess.kill();
```

---

One place we had trouble was getting the server commandline to shut down cleanly. Ideally we could do something like `rpc.Dispose()` in the `shutdown` handler, which should unblock the `await rpc.Completion` line and allow the cli to shut down cleanly. However, we found that calling `rpc.Dispose` meant that the `shutdown` response message was never sent, which confused the client end. In the end we settled for waiting for the shutdown method to complete, then killing the child process.

There’s some more error handling needed for this code for it to be properly solid, but having the child process simplifies quite a few things — we basically only need to kill the child process if it appears to have hanged, and restart the child process if it dies unexpectedly. At that point we should be able to handle the errors coming from vscode-jsonrpc and [retry, ignore, undo or rollback as appropriate](https://jimmybogard.com/refactoring-towards-resilience-a-primer/) with the new process.

Overall it’s still early days, but JSON-RPC appears to be working well for us so far. The simplicity of the protocol and its implementation is definitely appreciated and it works fully cross-platform.

![](https://cdn-images-1.medium.com/max/800/1*Nr23fWQ0okMdaIwLcwzY3Q.jpeg)

Photo by [israel palacio](https://unsplash.com/@othentikisra?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)
