---
title: Entities, components and systems
original: https://medium.com/ingeniouslysimple/entities-components-and-systems-89c31464240d?source=friends_link&sk=70fbf476aa2aff4ce8d89ad867206eb9
date: 2018-11-20
---

Game development can be a fun area to study not just because it’s fun (who doesn’t like making or playing games?) but also because it can raise new challenges and introduce different strategies that aren’t seen in more traditional programming.

At first glance, games appear to be an excellent case for object-oriented (OO) design: games are all about various kinds of objects interacting (or “passing messages”) between each other and updating their state appropriately. This can work really well (up to a certain level of complexity) and many game engines are written this way.

However, there are two serious flaws with OO design that can cause problems for games: for performance and maintenance.

Let’s address the performance problem first.

![](https://cdn-images-1.medium.com/max/800/1*bAHwrwdSMspq477t6d18gg.png)

[Carlos Carvalho, The Gap between Processor and Memory Speeds](https://pdfs.semanticscholar.org/6ebe/c8701893a6770eb0e19a0d4a732852c86256.pdf). Notice how the data is on a log-linear plot: the problem is much worse than it looks.

Processor speeds are increasing at a vastly higher rate than memory speeds; to a modern CPU, naively adding two numbers and storing the result is like taking a few seconds over the addition and then having to mail the answer to the next town over before the result takes effect. (You can see some more accurate numbers in [this gist](https://gist.github.com/jboner/2841832) as well as other places). Playing nicely with processor caches (both in terms of cache coherency and prefetching) can be incredibly important for application speed. What’s worse is that memory speed problems can be invisible on a lot of traditional code profilers.

Objects in OO tend to be connected by many indirect references — both references between objects themselves, and also all of the virtual table lookups incurred when methods are called on objects. OO objects are also allocated as necessary and spread all over the memory space. This random distribution of necessary data across memory causes the CPU to behave inefficiently as it constantly waits for memory accesses.

![](https://cdn-images-1.medium.com/max/800/1*lo2oeLwhea945z-ExBbFjw.png)

Objects in OO tend to be connected by many indirect references

So how do we go about fixing this problem? Fortunately, there’s a whole bunch of resources around programming for good memory access under the name of “[data-oriented design](http://gamesfromwithin.com/data-oriented-design)”. We’ll get back to implementing this further down the article, but the main idea is to arrange data in memory to maximize “[data locality](http://gameprogrammingpatterns.com/data-locality.html)” and to build code that uses large blocks of data all at once, rather than just operating on a single object at a time.

![](https://cdn-images-1.medium.com/max/800/1*3WiglKcEifrjV-WSQP-eCA.png)

Inheritance hierarchies can get deep and inflexible

So how can OO be bad for maintenance? One particular failure state for OO is large inheritance hierarchies which [turn out to be inflexible](http://whats-in-a-game.com/implementation-inheritance-is-evil/) and react to change badly over time — because most systems don’t fit into nice strict hierarchies. For example, in the above (made up but fairly typical) example we have a main backbone of types Renderable / HasPhysics / Collidable / Controllable which provide basic functionality to other, more specialized types. The problem is that no matter what order we choose to arrange this backbone in, there will be some subtypes which don’t fit in well. For example, classes like ‘invisible wall’ or ‘story trigger’ don’t fit into the above hierarchy, because everything subclasses from Renderable. This often causes hacks and Liskov violations where subclasses provide lots of null implementations of bits of functionality they don’t actually need, and code tends to creep upwards into giant, fragile base classes.

![](https://cdn-images-1.medium.com/max/800/1*gObzr-U5tFUl-TJYmTxhow.png)

Using components, we can pick and choose bits of behavior for each object we want

The solution to the second problem is to back off a bit from the OO tendency to model the problem domain in code, and look at modelling the solution instead: we’ll compose components instead of inheriting attributes. Each entity can mix and match components as necessary to build up the behavior required. In this version, often the components and necessary bits of data are paired together: each component by itself can still be a class with encapsulated data (but [doesn’t have to be](https://www.youtube.com/watch?v=6vmRwLYWNRo)).

Unity and Unreal are examples of popular game engines with an EC (entity-component) architecture. Annoyingly, these architectures are sometimes called **Entity-Component Systems**, which are easily confused with **Entity-Component-System Architectures** (talked about in the next section)

In some EC architectures, all entities share some common bits of data such as transform information such as position, rotation and scale, or some basic state data about whether the entity is currently “alive” in the scene. [Unity GameObjects](https://docs.unity3d.com/ScriptReference/GameObject.html) are one example of this style. In other versions of the pattern, all possible bits of data are pulled out into components and the entity ends up functionally just being a container for the components.

![](https://cdn-images-1.medium.com/max/800/1*HonnV-yTyd9wrB-TosAy3w.png)

Once we remove any actual responsibilities from the entity/game object itself, we can replace it with a single numeric ID

Splitting all of our objects into sets of components leads to a solution to the first problem and a way we can implement data-oriented design: we can rearrange the data [from an array-of-structures to a struct-of-arrays](https://en.wikipedia.org/wiki/AOS_and_SOA).

To do this, we also need to separate out the behavior and data for each component. Our components are now pure-data structs, and bits of behavior that operate on one (or more) components at a type are called “[systems](https://gamedev.stackexchange.com/a/31491/114877).”

![](https://cdn-images-1.medium.com/max/800/1*X26aoixT5efPoQMcpi351A.png)

Some components (like Position) are shared between systems. Other components can be private to a particular system, which allows for information hiding and greater optimization in memory layouts.

For example, let’s say that one scene in the game contains a thousand entities. Almost all of these entities contain a position, so we could just allocate a large 1000-element array for our position components, and store the position for each entity indexed by its entity ID. Since the array is almost completely populated, and we’ll want to reference entity positions on a regular basis, this is probably the most efficient way to store this information.

On the other hand, maybe only a relatively small amount of our scene’s entities have a velocity. In this case, we might use [some other strategies](http://bitsquid.blogspot.com/2011/09/managing-decoupling-part-4-id-lookup.html) to allocate just enough memory for the velocities we do have, and then map entity IDs into our velocities array.

Strategies like this let us potentially do a better job than a general-purpose GC or system allocator — although of course we should be careful and continually profile to make sure we’re actually benefiting from the extra complexity of managing our own memory.

To sum up, there’s still a [lot of choices in component systems](https://gamedev.stackexchange.com/a/4966/114877) and which ideas you decide to adopt are up to you. But it’s worth being aware of the possibilities — they might end up helping you write faster, more maintainable code in the future.

Further reading:

- A list of [useful data-oriented design resources](https://github.com/dbartolini/data-oriented-design).
- [http://gameprogrammingpatterns.com/](http://gameprogrammingpatterns.com/) — a discussion of other game programming patterns that might also be novel. The section on “data locality” is particularly relevant.
- [Building a data-oriented entity system (part 1)](http://bitsquid.blogspot.com/2014/08/building-data-oriented-entity-system.html) — if you want to build an ECS framework yourself.
- [Unity ECS documentation](https://github.com/Unity-Technologies/EntityComponentSystemSamples/blob/master/Documentation~/index.md) — if you want to build inside an ECS framework.
