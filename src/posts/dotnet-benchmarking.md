---
title: .NET benchmarking and profiling for beginners
original: https://medium.com/ingeniouslysimple/net-benchmarking-and-profiling-for-beginners-62462e1e9a19?source=friends_link&sk=38efde708f3c28611bd544fd5d5f3861
date: 2022-04-29
---

There comes a time, for most programs, when we need to make them faster.  
If you’re new to .NET, or have only tried profiling tools in older versions of .NET Framework, you might not be familiar with what tools are available for .NET Core / .NET 5. I was in this situation until just recently :)

> The conventional wisdom shared by many of today’s software engineers calls for ignoring efficiency in the small; but I believe this is simply an overreaction to the abuses they see being practiced by pennywise-and-pound-foolish programmers, who can’t debug or maintain their “optimized” programs. […] A good programmer will not be lulled into complacency by such reasoning, [they] will be wise to look carefully at the critical code; but only after that code has been identified. It is often a mistake to make a priori judgments about what parts of a program are really critical, since the universal experience of programmers who have been using measurement tools has been that their intuitive guesses fail.  
> _-- Donald Knuth,_ **_1974_**

This article is in two parts: capturing the current state of any performance issues with a benchmark, and then using a profiler to find which code is most important to improve.

**When working with performance issues, the most important step is to create a reproducible benchmark, then measure it before and after any changes.** There’s a lot of lore and tribal knowledge around performance in any programming language, and most of it is wrong. You’ll need a specific idea of what aspect of performance you’re trying to fix, and a way to measure any attempted fixes to verify if they actually help or not.

For .NET, the ideal way I’ve found to set up performance testing benchmarks is via [the BenchmarkDotNet library](https://github.com/dotnet/BenchmarkDotNet/). Due to the incredible complexity of CPUs, the CLR, and everything in between, there’s a lot of gotchas and edge cases to be wary of when attempting to get accurate benchmark measurements. BenchmarkDotNet handles these problems for us and helps us to focus on getting the work done that we need to. It also handles the tricky statistical calculations required to compensate for random variations between different benchmark runs and produce an accurate result.

---

The easiest way to get started with BenchmarkDotNet is to use a template. In a fresh folder, we’ll run the following commands:

```
$ dotnet new -i BenchmarkDotNet.Templates$ dotnet new benchmark --console-app
```

The first command downloads and installs the BenchmarkDotNet template packages, and the second applies the template to our folder.  
Adding the `--console-app` option creates a `Program.cs` entrypoint so we can run our benchmarks.

At this point we’d normally write the benchmark code into the newly-created `Benchmarks.cs` file. However, it’s fun to see what happens if we try to benchmark nothing at all:

![](https://cdn-images-1.medium.com/max/800/1*3kpuYTFCge435ECZgmxN-A.png)

Summary results after running a couple of empty benchmarks

After starting the benchmarks with `dotnet run`, we see a lot of progress as BenchmarkDotNet sets up and runs the benchmarks. Once everything is complete, it prints out a summary like the image above. This is generally the main thing to focus on when analyzing the benchmark results.

The first section shows the details of the environment. It’s important to note that benchmark results can vary depending on the hardware, .NET SDK version, OS and runtime version, and other factors. Benchmark results on one environment might not apply in the same way to other environments.

The next section is the main table of results. The `Mean` column shows the average time taken to run a single instance of the benchmark. Since there’s some skew in these results, BenchmarkDotNet has also added a `Median` column: this is another measurement of the average which is less susceptible to outliers.

The `Error` and `StdDev` columns are very important for interpreting the result. These are two different ways to measure confidence in the benchmark result. If we were plotting these results on a chart, we would use one of `Mean` or `Median` as the value to plot, and one of `Error` or `StdDev` as the error bars for that value.

There’s two things to note in our example:

- BenchmarkDotNet is incredibly accurate! It’s giving us results with a precision of about a tenth of a nanosecond, measuring to the level of individual CPU cycles! It can give us results this accurate for microbenchmarks because it runs the benchmark billions of times when necessary, and has lots of clever tricks to remove the benchmark framework overhead.
- In these particular results, the error is actually _greater_ than the average measured time for the benchmark. This means that BenchmarkDotNet’s estimate of the interval for the “true value” of the benchmark overlaps with zero: which is what we’d expect, given that we’re not actually benchmarking anything.

Indeed, BenchmarkDotNet warns us that the result isn’t significantly different from zero, which suggests we’re doing something wrong. It’ll often give out useful warnings like this when it’s suspicious of the benchmark: definitely worth paying attention to. It’s also telling us that it removed a couple of outliers. In our case this was the right thing to do, but [it might not be the behavior you want](https://github.com/dotnet/BenchmarkDotNet/issues/1256). Fortunately this (and many other aspects of BenchmarkDotNet’s behavior) are all configurable, so you can tweak the behavior as needed.

---

Anyway, that’s enough time spent raving about what a cool library BenchmarkDotNet is. What do we do once we have a benchmark, and we’re not happy with how fast it is?

Well, we could poke around the code, tweak things at random, and then rerun the benchmark to see if we actually improved performance! It’s not the best approach, but it’s already so much better than the same workflow without a benchmark.

We can be more effective with a profiler telling us which areas of the code are particularly slow. That way we’re much more likely to stumble on a performance improvement that actually makes a meaningful difference :)

Fortunately, BenchmarkDotNet makes it easy to get profiling results out of a benchmark run. First, we need to tweak the contents of the `Main` function in `Program.cs`:

```
public static void Main(string[] args)
{
 BenchmarkSwitcher
 .FromAssembly(typeof(Program).Assembly)
 .Run(args);
}
```

By passing the commandline arguments into BenchmarkDotNet, we can easily configure its behavior when we run it.

Next, we run the benchmarks with the `--profiler EP` option to enable [the Event Pipe profiler](https://benchmarkdotnet.org/articles/features/event-pipe-profiler.html). The summary results should now include the path of an exported file that [speedscope.app](https://www.speedscope.app/) can analyze. The results look something like this:

![](https://cdn-images-1.medium.com/max/800/1*ygD-ZBWe8bcnT0p9LyggZg.png)

This format is called a “flame graph,” and it’s incredibly useful for visualizing how much time is spent in different areas of the code. The horizontal axis shows the total time for one of BenchmarkDotNet’s iterations (which may include multiple copies of the benchmark itself: BenchmarkDotNet often unrolls loops to make the results more accurate). The vertical axis shows the stack trace across many different CPU samples over time, and groups the results together by method.

At the top of the flame graph is all BenchmarkDotNet methods that call into your code, and at the bottom is the framework or library methods that your code calls into. So the first job is to generally search through the middle section until you find method names that you recognise: after that point you’ll be able to compare how much time is spent in each and start to get an understanding of the profiler results.

The profilers available in BenchmarkDotNet are what’s known as “sampling profilers” — that is, they capture samples of the current stack trace at regular intervals. Collating all the different stack traces together can produce a flame graph like the one above.

Other kinds of profilers, like JetBrains’ dotTrace and Redgate’s ANTS, are known as “instrumenting profilers.” They can add instrumentation to the beginning and end of every method to track when they are being called. This instrumentation can produce less realistic benchmarks, since the profiler often disables method inlining and the extra instrumentation adds a lot of overhead to small methods. However, instrumenting profilers can gather a lot of detail that sampling profilers are unable to pick up on.

![](https://cdn-images-1.medium.com/max/800/1*v0CKpb4IJQVgcXR5OoeN_w.png)

A screenshot of ANTS Performance Profiler, showing hit counts for different methods (disclaimer: I used to work on this product :)

One trick with a profiler like this is to sort all the methods by the number of times they were hit. This can often point towards possible optimizations: for example, if you know your benchmark operates on a thousand objects, but you see a method being called a million times, that might indicate you have an n-squared loop. In some cases the function gets called many times with the same input, so you could rearrange code to call the function less often, or cache the results of the function. Of course, it’s important to keep your benchmark handy to test whether any of these changes actually have a real impact!

---

To sum up:

- Use a reproduceable benchmark to prove that performance improvements actually do something
- Use BenchmarkDotNet if possible
- Once you’ve found some code that’s slower than you want, point a profiler at it

I hope that’s helpful! Now go forth and make some code fast :)

![](https://cdn-images-1.medium.com/max/800/1*5js61XSXb5Kp7ie6f_3KkA.png)

Photo by [Tusik Only](https://unsplash.com/@tusik?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)
