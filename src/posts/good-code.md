---
title: How to actually write good code
original: https://medium.com/ingeniouslysimple/how-to-actually-write-good-code-b355b3f9e4ae?source=friends_link&sk=d50d969f95d176e8f1982073a3f6a1a6
date: 2019-12-24
---

I’ve been writing code professionally for almost a decade now, and yet when people ask how to write code properly I don’t really have a good idea. This job is weird.

A worrying amount of the time, I find myself relying on instinct or “experience” to try and figure out which solution to a given problem is going to cause maintenance problems and pain down the line. Really, it’s nothing more than an accumulated set of biases based on the problems of previous projects, and trying to distill it into actual advice is annoyingly tricky.

I’ve been trying to figure out how to get away from high-level principles (“SRP”, “KISS”, “[easy to delete](https://programmingisterrible.com/post/139222674273/write-code-that-is-easy-to-delete-not-easy-to)”, etc). Even though they’re good ideas, coming up with actual techniques for writing good code seems harder.

I’ve dumped out some of the results of this thinking below: hopefully it’s useful in some way or another.

#### Constraints

_First, do no harm:_

“Just don’t write bad code.” Sounds easy enough, right?

I think there might be something useful there, though. One thing I’ve consistently found to be true when dealing with libraries, frameworks, programming and design is that constraints are universally more useful than abilities. To put it another way: telling me what I _can’t_ do is much more useful than telling me what I can do. Programming is an insane world of magic and wonder: literally anything is possible. Especially when writing Ruby.

(This, by the way, is one of the reasons I’ve never gotten along with DDD as a design tool. While DDD has plenty of great ideas, it’s way too permissive.)

Putting constraints on the programmer is possibly the most important design task: either the right way to go should be the only possible one, or it should be so blindingly obvious that doing anything different would be strange.

The first task is to pick a language that imposes type constraints on the code: [typescript is great](https://medium.com/ingeniouslysimple/deebe44c8794), something like C# or Go is usefully boring, and I keep telling myself I’ll learn Haskell or Rust one of these days.

![“You were so preoccupied with whether or not you could, you didn’t stop to think if you should” [Jurassic Park, paraphrased]](https://cdn-images-1.medium.com/max/800/0*G0-AlRTVNIDUCqhd.jpg)

Me to myself after another jenga-like inheritance hierarchy or crazy nested function-producing-function function.

Beyond language choice, language constraints are almost always going to be some self-imposed _artificial_ limitation. Sticking to these constraints when writing code (such as creating immutable objects or avoiding inheritance) can produce a simpler solution by _limiting sources of complexity_.

Whichever constraints you choose to take, being appropriately consistent with them will generally lead to simpler, easier-to-understand code. There’s not much worse than code which has been boy-scouted a dozen different ways by well-meaning code cleaners when they aren’t pulling in the same direction.

In the rest of this article I’ll explore some constraints that I’ve found useful when coding.

---

#### Smells

Learning code smells can give you a practical way recognize code that could be improved, and refactorings give you reliable recipes to improve the code.

It’s important to remember that “code smells” don’t just mean “code I don’t like.” Code smells are just certain little structures and patterns in code which **might** be problematic.

To give a more concrete example, I’ve started to see mutation as a smell in the code I write. This doesn’t mean mutability is always bad idea at all! In many cases mutating some values (especially in a small-scoped, local way) is the best solution to a problem. But at the same time, solutions without mutability tend to be cleaner and clearer: immutability means there are vastly fewer moving parts to worry about.

Sandi Metz goes into more details on practical advice for turning smells into improvements in her excellent talk “Get a Whiff of This”:

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/PJjHfa5yxlU?si=ZY68zcf6EA3a5wVN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

The [“smells to refactorings” reference guide](https://www.industriallogic.com/wp-content/uploads/2005/09/smellstorefactorings.pdf) she mentions is a good resource as well!

There’s a big caveat with these sorts of cleanups: they need to be applied consistently. The best way to make a bad codebase worse is to clean it up in a dozen different ways: extract a method in some cases, extract a class in others, and so on. The [so-called ‘boy scout rule’](https://www.oreilly.com/library/view/97-things-every/9780596809515/ch08.html) (“leave code in a better state than you found it”) can actually be very dangerous if applied over time by various developers who each have a slightly different idea about what “better” means.

Being consistent with cleanups is a lot easier if you’re just working on code by yourself, of course. You may still want to keep a notebook somewhere detailing cleanups that need to happen, even if it’s just a `TODO.txt` file checked into the repo. Try to finish one cleanup and make the whole codebase consistent before embarking on the next.

---

#### Values

_An OO heresy:_

Fundamentally, object-oriented programming is about coupling data and all of the behavior for that data together. This, it turns out, is a bad idea.

In [a previous article](https://medium.com/p/237cfc850752) I mentioned something I called “naive OO.” The kind of OOP I learned at university: investigate the domain, find a list of domain objects, turn each domain object into a class and add behaviors to each class as appropriate. Use inheritance to create more specific types of each object and change behavior. That sort of thing.

The biggest problem with “naive” OO is that core domain objects (often `User` end up with dozens of responsibilities and piles of code unless special effort is made to pull responsibilities away.

![](https://cdn-images-1.medium.com/max/800/1*37nudw5YFzaQOo3RYcKrZA.png)

Rust is an example of a language that encourages splitting data types and the operations on them: using traits you can neatly implement custom behaviors for data types you don’t own.

Over the years I’ve found it’s much more important to model processes and behaviors instead of objects. Behaviors are what the code is actually for, after all. I’ve found that domain objects travel through the app as plain, immutable values: where there are traditional classes, they usually take the form of services acting on the data rather than being the data themselves.

Plain immutable values have a lot of advantages: they can be copied, shared between threads, serialized to disk and back again, sent over the network: all without any worries about the values falling out of sync or having to be locked for access. Values are a great way to decouple components from each other: if one object outputs a value that is then passed into a second object, we can insert anything we want between the two objects and the system will still work as expected.

This is an example of an “enabling constraint” from the first section: because we’ve limited the code we write in some way, we now have many more abilities.

> If the task you are working on can be expressed as a pure function that simply processes input parameters into a return structure, it is easy to switch it out for different implementations. If it is a system that maintains internal state or has multiple entry points, you have to be a bit more careful about switching it in and out. If it is a gnarly mess with lots of internal callouts to other systems to maintain parallel state changes, then you have some cleanup to do before trying a parallel implementation.

> [— John Carmack, Parallel Implementations](https://www.gamasutra.com/view/news/128325/Opinion_Parallel_Implementations.php)

---

#### **Boundaries**

_look for places where you can split decision and action:_

One practical pattern I’ve found extremely useful in the past few years is to split code which makes decisions from the code which actually carries out the actions. Looking around on the internet, there are lots of different statements of roughly the same idea:

- [impure/pure/impure sandwich](https://blog.ploeh.dk/2017/07/10/pure-interactions/)
- [functional core/imperative shell](https://gist.github.com/kbilsted/abdc017858cad68c3e7926b03646554e)
- [Tell Above, and Ask Below](https://michaelfeathers.typepad.com/michael_feathers_blog/2012/03/tell-above-and-ask-below-hybridizing-oo-and-functional-design.html)

As another example, I think this is one of the reasons React is really nice to work with: React components are really just a bunch of decisions about how the UI _should_ look; the React internals do the hard job of turning all those decisions into actions against the web page’s DOM.

One big advantage of organizing code this way is that it becomes much, much easier to test without complicated mocks or lots of expensive whole-system tests:

- Decision code takes some parameters as plain value inputs, and outputs a decision as another plain value. This code tends to be made up of pure functions, and is trivially easy to unit-test in an exhaustive way.
- Action code takes some instructions as value inputs, and then interacts with the outside world in some way based on the instructions it’s been given. This code needs to be integration-tested, but because we’ve separated out all the complicated decision-making code, action code tends to be very simple with a minimal number of conditionals. This means we can write just a few tests for each possible interaction, without having to worry about writing many tests for each possible combination of decision and action.

By doing this we avoid the main problems with both unit and integration testing by writing code which plays to the strengths of each testing method.

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/yTkzNHF6rMs?si=pfKYsXehM00-Cy1i" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

Gary Bernhardt’s “Boundaries”: the talk I stole all my ideas from.

---

#### Summary

To sum up, here are some practical constraints I’ve mentioned. As a general rule, I think you can apply these when actually writing code to end up with something simpler and better:

- Prefer immutable objects over mutable ones
- Prefer composition over inheritance
- Try to split code into parts which calculate decisions or perform actions, but not both.

In general, try to find “enabling constraints,” where limiting the code you can write makes things easier overall.

I have to admit: a lot of this blog post is speculative and it’s something I’m still figuring out. If you have any ideas, suggestions, or reasons you think I’m just plain wrong, I’d love to hear them!
