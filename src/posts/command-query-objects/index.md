---
title: Command/query objects and beyond
original: https://medium.com/ingeniouslysimple/command-query-objects-and-beyond-fcfefcf3ebee?source=friends_link&sk=35a3633afaae130a07cc33119a1478ea
date: 2020-02-21
---

First, a quick story:

Recently I’ve been reworking a Redgate-internal chatbot I wrote a few years ago. It’s done pretty well over the years, but I wanted to take it off the random VM it was running on and make it cloud-hostable.

The biggest change required was to rewrite the storage layer. I’d been playing rather fast and loose with the original designs, and needed to throw together some storage so that the bot could save data. I only needed key/value pairs at the time, so I threw everything into some JSON, saved it to a file on disk and called it a day.

Some time later, I realized I need to store lists of objects. I briefly considered upgrading the storage tech, before realizing that I could write everything out as a JSON array, then store that array as a string in the key-value store I already had! Yes, this story is partly a confession for my past sins :) Surprisingly, this JSON-in-JSON solution actually worked well for about five years.

Fast-forward to today. The upshot of this process is that I had core logic code which depended on an `IListPersistenceApi<T>` interface, which could load and save lists of arbitrary objects. This all worked pretty well: the implementing code was simple enough, and mocking the interface for unit tests was easy too.

![](./1-Yo1asFfHISvcBo03iI-NPQ.jpeg)

Photo by [Chris Tweten](https://unsplash.com/@ctwtn?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)

The real problems started when I wanted to move the bot’s hosting to something a bit more managed. Switching to some cloud storage would make the bot a lot more portable, since the bot itself would become effectively stateless.

Unfortunately, real databases don’t work like my `IListPersistenceApi<T>` api does. While unit tests could easily swap out the storage layer, the client code still ended up being too coupled to the structure of the API I invented. I’d ended up writing client code like “1: fetch list of games. 2: filter to remove last item. 3: set whole list of games” to implement relatively simple operations. (While being wildly inefficient, this still worked well since the amount of data involved was tiny.)

---

So what went wrong? Thinking about this in hindsight: the main problem was that I approached the storage API by thinking what I knew I could write. The getList/setList API was super-easy to implement, but ended up making all the code around it worse, since it had subtle mismatches with what I actually needed to do.

I’d ended up just writing some generic repository of objects instead of implementing the operations that actually mattered. Generic repositories are a pattern that usually seem like a good idea at the time, but end up providing APIs which are [either too general or too specific](https://www.ben-morris.com/why-the-generic-repository-is-just-a-lazy-anti-pattern/). They cause the code around them to contort itself into whatever shape the repository requires, and [have the wrong boundary for transactions](https://rob.conery.io/2014/03/03/repositories-and-unitofwork-are-not-a-good-idea/). They’re even worse if you create one repository per database table, since the client code now has to coordinate between repositories and manage their transactions itself!  
Our database is leaking all over the place.

---

One commonly-proposed solution is “command/query objects”. The basic idea is to give each database operation its own dedicated object with any relevant parameters and an Execute() method. The object owns the transaction boundary and all the code needed to implement one conceptual operation against the database.

This pattern is quite nice. I particularly like how it isolates each database operation from the others, allowing client code to only depend on what it needs. The query object can also serve as its own [builder](https://www.martinfowler.com/bliki/ExpressionBuilder.html) if the query has many parameters to set. The pattern does have a few major downsides, however. Writing a whole class for each operation is a lot of boilerplate, especially for simple operations which don’t benefit from the builder pattern. Also, you may need to insert an extra factory seam for each object if you want to be able to swap out mock objects for testing.

The core idea we want to take from command/query objects is writing our API in terms of “operations against the database” instead of repositories of objects. We can go back to a repository-like interface for most cases, but we want to write our interface methods in terms of **what the client code needs** rather than what our database provides.

This idea of **consumer-driven APIs** is ultimately the lesson I think I want to take away from this whole story. Whether we [bake it into our process](https://github.com/testdouble/contributing-tests/wiki/Discovery-Testing) or just keep it in mind as we code, designing interfaces that do only what the client code requires should prevent [premature generalization](https://haacked.com/archive/2005/09/19/avoid_premature_generalization.aspx/) and simplify code on both sides of the abstraction.

There are loads of advantages here, whether we’re splitting our database operations into separate objects or not:

- We can implement each operation however we want (through an ORM, directly in SQL, calling a stored proc or something else) and it doesn’t matter. All the client code cares about is that the operation it wants to happen gets done, or the query returns the right results.
- We can write integration tests against the database to verify that each operation behaves as the client code expects. The tests let us flip between any of the above implementation options as necessary.
- The interfaces are easier to mock, since we can think in terms of the behavior that the client code wants rather than trying to reproduce how the database works. We can reuse the integration tests as contract tests for the mock to make sure they work as intended.
- A lot of implementation details become easier to hide. For example, the boundary hides the whole object/relational mapping problem, with the interface returning fleshed-out object graphs through whatever method is best. Another example: I ended up implementing the “revert game results” operation by setting an archived flag on the relevant rows rather than deleting them outright. If something goes wrong the information can always be recovered by digging in the database.
- A personal benefit: I’m not sure how the new cloud storage APIs I’m building on work. If I’d written tests against a generic CRUD repository then I’d just have been mirroring the azure library code and not testing anything interesting. Similar to the mocking point, by writing integration tests against operations I have more confidence that my tests are actually testing useful things.
- We can make each operation its own transaction, rather than needing explicit `SaveChanges()` calls. By making the transaction boundaries explicit rather than implicit, we avoid many bugs around state management and caching issues.
- If we’re strict about only implementing APIs that each bit of client code needs, we get less coupling between queries that happen to look similar but serve totally different bits of code.

Are there any downsides? I’m not sure, but I think there might be one: you might end up with a bit more logic behind the database layer than you’re comfortable with. If you prefer to keep as much logic as possible in code that can be unit-tested, you may end up with interfaces that are a tighter fit around the database. Ultimately it’s up to you to decide what’s best for your project.

---

So, to sum up:

- Simplify the database layer by thinking in terms of operations against the data instead of repositories of objects.
- More generally, design APIs consumer-first to end up with simpler, more maintainable code.
