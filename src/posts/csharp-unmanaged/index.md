---
title: Managing unmanaged objects in C#
original: https://medium.com/ingeniouslysimple/managing-unmanaged-objects-in-c-6c69968c60eb?source=friends_link&sk=4a82a4153226fcfaa31e019532a3cd1f
date: 2021-01-04
---

A couple of months ago, we ran into a tricky race condition with the way we were handling temporary files. It took a while to track down, but ended up being a good example of how C#’s garbage collection (GC) works, so I wanted to turn it into a blog post.

First, a quick bit of terminology. We say C# is a ‘managed’ language since it will generally manage all your memory for you. ‘Managed objects’ are those objects that the GC knows about and can clean up when no longer needed. One of the advantages of programming in C# is that, most of the time, we don’t need to worry about memory management or how the GC works.

However, sometimes it causes issues that need to be investigated. Here’s a stripped-down version of the code that was causing the problem:

```
internal sealed class TempDir : IDisposable
{
    public DirectoryInfo DirInfo { get; };
    private TempDir(DirectoryInfo dir) => DirInfo = dir;

    public static TempDir Create() { ... }

    private void Dispose() => this.dir.Delete();

    ~TempDir() => Dispose();
}
```

`TempDir` is a wrapper class which turns an unmanaged resource (a `DirectoryInfo` representing a folder on disk) into a managed object that the GC can handle. Since this class only holds a single unmanaged resource, and this code’s consumers only sees managed objects, we can avoid implementing [the more complicated “Dispose pattern”](https://docs.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose) for this code.

The important parts of the above class are the last two lines. The `Dispose()` method (implementing the `IDisposable` interface) gives us a standard way to explicitly clean up the object. Alternatively, the finalizer (`~TempDir`) provides an implicit way for the GC to clean up unmanaged resources before the object is destroyed. Of course, in a real program we’d want extra error checking here, to prevent double-deletions or other errors from causing crashes.

This class, by itself, is pretty reasonable. However, the way we were using it was an issue. Take a look at the below example test:

```
[Test]
public void Test_some_system_behavior_with_projects()
{
    var project = CreateTestProject();

    var result = TestSystem.DoSomethingWith(project);

    Assert.True(result.IsGood);
}

private FileInfo CreateTestProject()
{
    var tempDir = TempDir.Create();
    var projectFile = new FileInfo(
        Path.Combine(tempDir.DirectoryInfo.FullName, "project.conf")
    );

    File.WriteAllText("some test project", projectFile.FullName);

    return projectFile;
}
```

Can you see what the issue is yet? Don’t worry if not — it’s pretty subtle. This test actually passes **most of the time!** When it fails, it complains that the project directory has been deleted somewhere along the way.

---

The big issue with the garbage collector is that it’s **nondeterministic**. Once objects go out of scope, they sit around in limbo for a while until a GC is triggered. In the case of the above test, the `tempDir` variable (and its associated folder on disk) is eligible for collection as soon as the variable isn’t referenced any more. This means the folder could be deleted before the `File.WriteAllText` line even runs! However, because finalizers need something to trigger them ([a certain amount of memory allocations](https://docs.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals?redirectedfrom=MSDN#conditions-for-a-garbage-collection), an explicit `GC.Collect` call or [a process shutdown](https://blog.stephencleary.com/2009/08/finalizers-at-process-exit.html)) then the folder deletion usually gets delayed until the test has a chance to pass. On rare occasions, the race condition triggers and the folder gets cleaned up in the middle of the test, causing the test to fail in a flaky way.

One way to make the bug more obvious is to wrap the `tempDir` variable [in a `using` statement](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using-statement#remarks). `using` cleans up the resource exactly at the point where the C# variable goes out of scope, instead of some time later. This would make the test fail 100% of the time instead of rarely (which, counterintuitively, is definitely a better result).

If you’re familiar with [the concept of `RAII`](https://en.wikipedia.org/wiki/Resource_acquisition_is_initialization) from other programming languages, then `using` in C# is roughly equivalent.

---

So how do we fix the problem in this code? I think there are a few options, depending on what your requirements are:

<b>Create the `TempDir` in the outer scope and pass it into `CreateTestProject`</b>.  
In this case, `CreateTestProject` wouldn’t be responsible for creating its own temporary folder; instead it would be passed a workspace to create a folder in.

This option requires a bit more code: we need an extra parameter on `CreateTestProject`, and we’d need to add a `GC.KeepAlive(tempDir)` line to the bottom of the test. This ensures that the `tempDir` variable is marked as being used for the full length of the test method. Alternatively, we could put `tempDir` into a `using` statement to ensure that it is cleaned up exactly at the end of the test.

The advantage of this option is that we’re being much more explicit about the temporary folder’s *lifetime* — the code makes it clear that the folder needs to exist for the full duration of the test.

<b>Wrap the `TempDir` in another object, so that it doesn’t go out of scope when `CreateTestProject` returns</b>.  
Instead of considering the problem in terms of object _lifetime_, we could instead think about object _ownership_. Thinking this way, the problem with `CreateTestProject` is that it returns a `FileInfo` representing the project file, but the project file depends on a temporary folder which isn’t returned. If consuming code is responsible for owning a project file, then it also needs to own the associated folder.

The fix here is to create a new `TestProject` class to return from `CreateTestProject`. This class would contain references to both the project file and temporary folder. Since this class owns the temporary folder — a managed resource implementing `IDisposable`—then it should also implement `IDisposable` and pass the `Dispose()` call through to the folder. This class wouldn’t own any unmanaged resources, so it doesn’t need its own finalizer.

The big advantage here is that so long as we pass this new class everywhere that we want to interact with the test project, the consuming code will keep the `TestProject` alive, which in turn keeps the `TempDir` alive. Once the `TestProject` is no longer referenced, it should make the `TempDir` eligible for garbage collection. Implementing `IDisposable` like this should also mean that `using` statements work as expected.

Thinking about object ownership like this makes this the most object-oriented solution.

<b>Remove the finalizer from `TempDir`</b>.  
This is the easiest option, but the least ‘correct’ from a lifetime or ownership perspective. The upshot is that the GC is no longer involved in cleaning up the temporary folder: the only way is through the `Dispose()` method (either by calling it explicitly or through a `using` statement).

While this isn’t an ideal solution, it’s the one we eventually chose. Our reasoning was that the test failure wasn’t an isolated incident. In our production code we’d also seen similar issues with temporary folders being prematurely deleted, and we weren’t sure that we had applied complete fixes in those situations. With this solution we’re trading risks: removing the finalizer means that temporary folders might be left lying around, but that’s a safer failure state than having them deleted in unexpected places.

This is a highly contextual decision. With other types of unmanaged objects this might be a really bad idea. For example, if you’re handling a database transaction that needs to be committed, then you’re more likely to prioritise getting the transaction committed in a finalizer. The temporary folders we’re talking about in this case are pretty small: if we were thinking about larger folders that could significantly impact the user’s disk space, then we’d have different priorities as well.

---

Hopefully this has been a useful example of how the .NET GC works and how to write code that works with it. If you have any questions or suggestions for things to explain better (or corrections!) then feel free to post a response!

![Four garbage bins in a street.](./bins.jpeg)

Photo by [Paweł Czerwiński](https://unsplash.com/@pawel_czerwinski?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)
