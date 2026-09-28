---
title: Easy GDPR-safe exception messages with C# interpolated strings
original: https://medium.com/ingeniouslysimple/easy-gdpr-safe-exception-messages-with-c-interpolated-strings-90852ccbd7a8?source=friends_link&sk=85acdf945cdc2ebbe2e81464ecd25b42
date: 2022-08-22
---

_How a brand new C# feature can help with safe, painless, detailed exception reporting._

Let’s say you’re writing an application that reads config files, and you need to handle errors:

```
try
{
  config = ReadConfig(configFilePath);
}
catch
{
  throw new MyAppException("Failed to read config");
}
```

This is largely sensible code, and it works. But what is a user supposed to do if they see an error message like “Failed to read config”? We can make the error a lot more helpful by providing detail:

```
try
{
  config = ReadConfig(configFilePath)
}
catch (Exception e)
{
  throw new MyAppException(
    "Failed to read config from path " + path + ": " + e.Message);
}
```

Now this is much more likely to give the user a way to figure out what the problem is, and everyone is happy. But what happens when this exception ends up going other places as well?

```
try
{
  RunMyApp();
}
catch (MyAppException e)
{
  Monitoring.TrackException(e);
  Logger.LogExceptionSomewhere(e);
}
```

If this exception is sent from a user’s machine, we need to start worrying about PII (personally-identifiable information) that could be part of the exception. If the exception contains PII, then it (and any data that can be correlated with it) becomes subject to the GDPR, or some equivalent local data protection laws. We want to avoid this unless it’s actually necessary.

In the above example, there’s two sources of PII that could become part of this exception: `configFilePath` may contain users’ names (eg `c:\users\alice.example\my_app_data`) and the underlying exception could also contain arbitrary information which we don’t control.

So what can we do? We want users to have as much information as possible to diagnose the problem, but we want to avoid sending some of that information as an exception report.

The solution we came up with is `GuardedString`: a type that wraps around `string`, but contains both “safe” and “unsafe” values:

```
public class GuardedString
{
  public GuardedString(string safeValue, string unsafeValue)
  {
    SafeValue = safeValue;
    UnsafeValue = unsafeValue;
  }

  public string SafeValue { get; }
  public string UnsafeValue { get; }
}
```

The idea is that we can construct one of these to hold our exception messages: the “unsafe value” may contain PII, but can be shown to users, while the “safe value” is fine to log or send to any remote monitoring services. We use `GuardedString` in our application’s exception type, making sure that the base `Exception.Message` property only ever sees the safe value:

```
public class MyAppException : Exception
{
  public GuardedString GuardedMessage { get; }

  public MyAppException(GuardedString guardedMessage)
        : base(guardedMessage.SafeValue)
  {
    GuardedMessage = guardedMessage;
  }
}
```

So this solves our problem pretty neatly. But you might have thought “aren’t all those `GuardedString`s going to be a pain to construct? After all, now we have to specify every string twice!” And you’d be right!

Fortunately, a new C# 10 feature comes to the rescue. The basic idea is this: we know that any literal strings cannot contain any PII _by definition_, since they’re the same for every user. Variables and interpolated bits of strings, however, may be unsafe.

The C# feature is built around the new `[InterpolatedStringHandler]` attribute. A class or struct marked with this attribute can become a method parameter:

```
public class GuardedString
{
  // ...
  public static GuardedString From(GuardedStringHandler handler) { }
}

[InterpolatedStringHandler]
public struct GuardedStringHandler
{
}
```

and then that parameter can accept an interpolated string:

```
throw new MyAppException(
  GuardedString.From($"Failed to open file {filePath}!"));
```

Note how we’re passing an interpolated string to `GuardedStringHandler.From`, even though that method doesn’t accept a string. This is only possible because of the `[InterpolatedStringHandler]` attribute.

What happens next is that the compiler changes our consuming code to something like this:

```
var handler = new GuardedStringHandler(26, 1);
handler.AppendLiteral("Failed to open file path ");
handler.AppendFormatted(filePath);
handler.AppendLiteral("!");
throw new MyAppException(GuardedString.From(handler));
```

Now it’s up to us to define those methods on `GuardedStringHandler`. We can define them any way we want, so long as the above code compiles:

```
[InterpolatedStringHandler]
public struct GuardedStringHandler
{
  private readonly StringBuilder _safeBuilder;
  private readonly StringBuilder _unsafeBuilder;

  public GuardedStringHandler(
    int lengthOfLiteralStringParts,
    int countOfFormattedParts)
  {
    _safeBuilder = new StringBuilder();
    _unsafeBuilder = new StringBuilder();
  }

  public void AppendLiteral(string s)
  {
    // string literals are the same for every user, so they're safe:
    _safeBuilder.Append(s);
    _unsafeBuilder.Append(s);
  }

  public void AppendFormatted(string unsafePart)
  {
    // interpolated parts may be unsafe, so redact those:
    _safeBuilder.Append("***");
    _unsafeBuilder.Append(unsafePart);
  }

  internal GuardedString GetResult() =>
    new(_safeBuilder.ToString(), _unsafeBuilder.ToString());
}
```

We could have many `AppendFormatted` overloads, or we could just define a single generic implementation that takes a `T` and calls `T.ToString()`. It’s up to you :)

Anyway, the upshot is that we now only have to define our string once, and we’ll automatically get a `GuardedString` value with both safe and unsafe values. This is a huge saving compared to having to write out every error message twice.

This is just one use I’ve found for custom interpolated string handlers in C# — I’m sure there are many more! I’d love to hear about any cool examples you might come up with.

![](./1-Mj-Q5PFg8GajHCNA6Y0o8g.png)

Photo by [Alexander Naglestad](https://unsplash.com/@alexandernaglestad?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)
