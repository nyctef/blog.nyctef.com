---
title: OO is dead
original: https://blog.nyctef.com/post/112632052632/oo-is-dead
date: 2015-03-12
---

<p>Note: This article is essentially a re-hash of Gary Bernhardt’s excellent Boundaries talk [1]. I’d encourage people to watch that and see what they think.</p>

<p><strong>The problem</strong></p>

<p>It’s really hard to find code architectures that scale. Even when code has been written to exacting standards of perfection, and the whole design has been well-thought-through, a year later it’s not uncommon to see cracks throughout the design and bulges at the seams. Of course, the problem is even worse for codebases that didn’t get such a good start in life.</p>

<p>Clearly, the answer isn’t to spend even more time on big design up-front; the problems the code is trying to solve now couldn’t have been foreseen at the time it was written. Instead, we need to push for code that can be adapted and refactored more easily.</p>

<p>I’m going to start with the assertion that, when programming, there are three distinct types of code that we write:</p>

<p><strong>Data</strong> is easy to understand. It just sits there looking pretty, waiting for something to happen. It doesn’t need testing. It doesn’t even need to mutate at all. It just is. And yet, data is somehow integral to the whole process of programming. Picking the right data structures can be incredibly important for an application, but insofar as most data structures provide the same interfaces, they can be treated as an implementation detail. We don’t care how our lists are implemented internally so long as it doesn’t cause us problems.</p>

<p><strong>Logic</strong> is the thing we care about most of the time. Logic is decisions about what programs actually do. As we’ll see in a moment, Logic is particularly well-suited to functional programming, since it’s all about taking some input, making decisions about it, and then returning the answer as some output.</p>

<p><strong>Process</strong> is the code that we (unfortunately) have to write just to make the program do something. It’s about interacting with the outside world in various ways, either manipulating the UI or talking to a database. Process tends to be much harder to do in a functional style, since it’s all about changing state. By definition, process tends to involve very little decisionmaking, but knows a lot about dependencies.</p>

<p>The problem with OO design, and Domain-Driven design in particular, is that it encourages mixing data, logic and process into the same classes and methods, sometimes based on real-life responsibilities of domain objects rather than code processes. In fact, having data sitting by itself is considered a code smell in DDD. [2] Why is this a problem? Well, mixing data with logic or with process isn’t too bad, since data is inert and generally doesn’t add complexity. However, I assert that mixing logic with process produces code that is several orders of magnitude harder to reason about and harder to test effectively. It becomes much harder to separate what the code is doing and why the code is doing it. It becomes much harder to test units of code without testing all of their dependencies at the same time. It becomes much harder to understand or refactor important decision logic, because the imperative process code is causing side effects that have to be reasoned about. It becomes harder to introduce concurrency or asynchrony because state has to be maintained and shared between different threads.</p>

<p>To go back to our original goal, the most important of these points is difficulty in refactoring - if we have small composable components that we can rearrange and refactor easily, we can solve a class of much harder problems when they are discovered rather than having to try and architect for them in advance.</p>

<p>This idea of not mixing state-based imperative code with purely functional code is so important that entire languages have been written around it. Unfortunately, until somebody actually manages to write something in Haskell and the singularity begins, [3] we’re stuck with our plain old OO languages. However, by limiting ourselves and not mixing logic and process, I assert we can still reap most of the benefits of working in an OO language without introducing the sort of massive complexities described above.</p>

<p>Some of the results of this separation are already well-known as design patterns. For example, at the boundaries of an application we might want to mix the process logic into our data classes. If we do it right, we will probably end up with a viewmodel or a set of active record classes. We already know that it’s a bad idea to put logic into these classes, since that heavily couples that logic to whatever UI framework or database ORM is currently in use.</p>

<p>At the other end of the program, we start off with pure data classes and functions that transform them into other bits of data. However, we might find that some functions fall naturally into those data classes, giving us more readable code than the purely functional alternative, and tending towards the OO classes we know and love. We want to limit the amount of responsibilities for data classes to a bare minimum - we should never need to mock them out, and they should be trivially serializable. Using a visitor pattern allows us to do polymorphic dispatch on pure data types without putting any logic- or process-specific code in them, which can help keep those pesky responsibilities away.</p>

<p>Let’s work through an example to see what this might look like in practice. This is a real bit of code we were working on in a custom build tool last year:</p>

<p><script src="https://gist.github.com/nyctef/25d5d937140861cf6e51.js"></script></p>

<p>We started off wanting to extract the first line into a separate method (<code>FlatDependenciesForPackage</code>), but we couldn’t pass an anonymous class (the <code>new {…} part</code>) across a method boundary. We created a quick Dependency class, and eventually realised that extracting methods into the new class gives us this:</p>

<script src="https://gist.github.com/nyctef/620e4e6443261e20f057.js"></script>

<p>So far, so OO. Note how the <code>AssertConsistent</code> method becomes much more readable now we’re using methods on Dependency. We could argue about whether <code>IsSatisfiedByOneOf</code> actually belongs on the class or as an extension method, but what’s more important is that (since it’s purely functional) we can change our mind easily at a later date.</p>

<p>But wait! Throwing an exception is an imperative piece of process! We can rewrite this further:</p>

<script src="https://gist.github.com/nyctef/58aaf25d7bcef5de8860.js"></script>

<p>Hmm. By reproducing our previous behavior, we ended up with a spurious call to <code>.First()</code> which looks out of place. We could improve our error message by telling the user about all of the problems at once:</p>

<script src="https://gist.github.com/nyctef/b83d9e58fa7bea63cc86.js"></script>

<p>Now <code>AssertConsistent</code> only cares about process-related things: a dependency on <code>GetUnsatisfiedDependencies</code>, an exception to throw if there are any unsatisfied dependencies, and a message to display to the user. All of the actual decision-making <b>can be easily unit-tested</b> based on pure data values <b>without any mocking</b>.</p>

<p>As a side note, I think it’s important that we’ve kept everything private (including the <code>Dependency</code> class) except for the <code>AssertConsistent</code> method which needs to be called elsewhere. For one thing, this makes the API of this class a lot easier to use, since there’s no clutter that anyone else has to care about. Writing in a functional style seems to end up with a lot of functions that do nearly the same thing but with a slightly different signature (eg <code>ExceptionMessageForUnsatisfied[Dependency/Dependencies]</code> or <code>IsSatisfiedBy[OneOf]</code>) and if they’re not properly encapsulated it can be easy to call the wrong thing and miss out a crucial bit of logic. But more importantly, I think we need to spend a lot more effort justifying shared code. Code duplication might cause a bug today, but code coupling can cause architecture and build problems that last for years. [4]</p>

<p>I think this demonstrates the benefits that applying this style to individual methods and components can bring. It’s worth noting that separation of concerns can apply at larger scales as well - even if the low-level implementation isn't fully functional - so long as a component presents a functional interface (meaning state change can’t be detected from the outside) then it can be treated as a functional component and be more easily tested by doing so.</p>

<p>I’m currently working on trying to implement this functional/imperative style in larger projects like the SQL Compare engine. If you have any comments or similar experiences then I’d love to hear them.</p>

<p>[1] <a href="https://www.youtube.com/watch?v=yTkzNHF6rMs">https://www.youtube.com/watch?v=yTkzNHF6rMs</a></p>

<p>[2] <a href="http://sourcemaking.com/refactoring/data-class">http://sourcemaking.com/refactoring/data-class</a></p>

<p>[3] <a href="http://engineering.imvu.com/2014/03/24/what-its-like-to-use-haskell/">http://engineering.imvu.com/2014/03/24/what-its-like-to-use-haskell/</a></p>

<p>[4] Just because we’ve designed the Dependency class to be easy to share, it doesn’t mean that other components will have the same idea about what it means to satisfy a dependency. If we share it, we will end up adding extra flags to IsSatisfiedBy’s parameter list to tweak the behaviour one way or another for different users, which always ends up causing an explosion in complexity.</p>

<p><a href="http://michaelfeathers.typepad.com/michael_feathers_blog/2012/03/tell-above-and-ask-below-hybridizing-oo-and-functional-design.html">http://michaelfeathers.typepad.com/michael_feathers_blog/2012/03/tell-above-and-ask-below-hybridizing-oo-and-functional-design.html</a></p>
