---
title: "Typescript (or: How I learned to stop worrying and love web development)"
original: https://medium.com/ingeniouslysimple/typescript-or-how-i-learned-to-stop-worrying-and-love-web-development-deebe44c8794?source=friends_link&sk=9fc5644212b49b46d01da617c7c79325
date: 2018-09-17
---

![](https://cdn-images-1.medium.com/max/800/1*ddF_QFJmaK99SoS1bve_EQ.png)

For most of my programming career so far I’ve been using C# and working on desktop tools, and only dipping into more dynamic languages like javascript or python for fun hobby projects. That all changed recently when I started working on a new tool with a web UI (albeit hosted in electron for the moment) and a whole new bag of technologies. Some felt kinda familiar — React is a lot like WPF except without the two-way binding, which is an improvement, and Redux feels like [the logical conclusion](https://www.youtube.com/watch?v=yTkzNHF6rMs) to a growing love of functional programming that I’d been developing over the years — but typescript caught me by surprise a little.

On the one hand C# is basically Java — but with a bunch of fun and useful ideas stolen from other languages like lambdas and LINQ, and a couple of new ideas like async/await added on top. Typescript feels like another step in that direction, with features like non-nullability and discriminated union types (coming …eventually to C#) already included with the language.

Typescript isn’t a direct upgrade from C#, though — it’s still fundamentally javascript at the core (one way of ‘compiling’ a typescript file is to just strip out all the typescript-specific annotations and ship what’s left) so there are always going to be some points where the types don’t line up quite right, or something that shouldn’t compile passes all the checks. But typescript still feels like it provides roughly 90% of C#’s typing power with around 50% of the effort (more on that later) and adds a bunch of bonuses on top.

The fact that typescript is built on top of javascript (rather than being a separate language that just compiles to javascript) does limit it in some ways. For example, extension methods are a long-requested feature that [can’t be implemented right now](https://github.com/Microsoft/TypeScript/issues/9#issuecomment-74302592) because of the ways that trying to change the behaviour of javascript code depending on type information that might or might not be present can break quite easily. In addition, some proposed alternatives (like adding new operators to solve the problem) need to be avoided since having typescript and [future ECMAscript proposals](https://github.com/tc39/proposal-bind-operator) implement certain features slightly differently is a guaranteed recipe for pain.

---

But that’s really a distraction for now. What **can** typescript do which makes it worth it?

The biggest difference between C# and typescript is that typescript has a structural type system, as opposed to C#’s nominal one. In C#, if I define a method which takes a `WidgetScrubber`, then only instances of that particular `WidgetScrubber` class can be passed to the method. However, in a typescript function, I could pass any object which has the same _shape_ as `WidgetScrubber` to the function and have it work correctly. This halfway-point between C#’s strictness and the wild west of duck-typing everywhere feels really productive; for example in most places in C# where we’d end up defining interfaces and classes as pairs, we can still do the right thing by accepting interfaces in typescript but not require the extra effort to create the duplicate definition for the class. In practice, most of the time we’ve ended up just creating object literals with the right shape on the fly — we very rarely create classes unless they’re actually necessary (which is usually for stateful React components).

The lack of nominal typing also comes with a few smaller productivity boosts as well. We’ve been writing much fewer adapter classes, since we don’t need to declare in advance that our objects are implementing other interfaces, and we can write interfaces that existing third-party objects already implement.

Structural typing can be a little annoying in some cases, though. For example, if you’re trying to use types to make sure you don’t get different vectors mixed up, in C# you might write something like this:

```csharp
class Point
{
 public int X { get; }
 public int Y { get; }
 public Point(int x, int y)
 {
 X = x; Y = y;
 }
}

class Velocity
{
 public int X { get; }
 public int Y { get; }
 public Velocity(int x, int y)
 {
 X = x; Y = y;
 }
}
```

.. but in typescript these two types would be considered equivalent since they have the same shape, so you’d probably end up writing something like this instead:

```typescript
interface Point {
  x: number;
  y: number;
}

interface Velocity {
  dx: number;
  dy: number;
}
```

(and as a side note, look at just how much more terse the typescript interface definitions are compared to the C# classes)

---

Typescript almost got nullability wrong. But fortunately for us, in version 2.0 the `—-strictNullChecks` option was added which removes the assumption that any value can also be `null` or `undefined` in addition to its stated type. It doesn’t sound like much, but allowing `null` to be meaningful again and removing the null paranoia from most of the code really does make a big difference.

To see how useful this can be, let’s look at a fairly common problem in C# code. We have a collection we’re searching through, and the search might not find anything. If we just use plain `.First()`, then the failure will get immediately thrown as an exception:

```
nextEmptyWidgetBucket = buckets.First(x => x.WidgetCount == 0)
// ^ might throw InvalidOpException
nextEmptyWidgetBucket.AddWidget(nextWidget)
```

Using `.FirstOrDefault()` gives us a chance to handle the missing result (by returning `null` if it wasn’t found) but it’s still very easy to miss:

```
nextEmptyWidgetBucket = buckets.FirstOrDefault(x => x.WidgetCount == 0)
nextEmptyWidgetBucket.AddWidget(nextWidget)
// ^ might throw NullReferenceException
```

But in typescript, the compiler is rather more helpful:

```
nextEmptyWidgetBucket = buckets.find(x => x.widgetCount === 0)
nextEmptyWidgetBucket.addWidget(nextWidget)
// ^ this is a compile error!
```

The type of `Array<Bucket>.find` is explicitly `Bucket | null`, so the compiler enforces that we have to handle the not-found case. Typescript can do simple flow analysis to see how the types of variables change over time, so by wrapping the `addWidget` call in a simple if statement (or throwing in the not-found case) we can make the compiler happy again:

```
nextEmptyWidgetBucket = buckets.find(x => x.widgetCount === 0)
// the type of nextEmptyWidgetBucket here is `Bucket | null` ...

if (nextEmptyWidgetBucket !== null) {
 // ... but here it's just `Bucket`, so this call is fine:
 nextEmptyWidgetBucket.addWidget(nextWidget)
}
```

---

Another extremely useful feature of Typescript’s type system is the idea of discriminated unions. Let’s say we’re building a pet-feeding app (the next big thing in home automation) and we need to handle different kinds of pets. A simple solution in C# might look something like this:

```
public IEnumerable<Food> GetFood(FoodDispenser dispenser, IPet pet)
{
 switch (pet)
 {
 case Cat cat:
 return new[] { dispenser.ProvideWetCatFood(cat),
 dispenser.ProvideDryCatFood(cat) };
 break;
 case Dog dog:
 return new[] { dispenser.ProvideDogKibble(dog) };
 break;
 }
}
```

This works well enough, but we might have several switch statements on `Pet` scattered around the code, and forgetting to update one or more of them when a new `IPet` type is introduced can be a common source of bugs. The standard solution to this problem in C# is the [Visitor Pattern](https://en.wikipedia.org/w/index.php?title=Visitor_pattern&oldid=852953687#Classic_visitor), which allows the compiler to check exhaustiveness at the cost of a huge amount of hand-written boilerplate cluttering up the relevant model classes.

At face value, the typescript solution isn’t much better.

```
function getFood(dispenser: FoodDispenser, pet: Pet): Food[] {
 switch (pet.type) {
 case 'CAT':
 return [dispenser.provideWetCatFood(pet),
         dispenser.provideDryCatFood(pet)];
 case 'DOG':
   return [dispenser.provideDogKibble(pet)];
 }
}
```

However, there’s some magic happening with the types involved:

```
interface Food {}

interface FoodDispenser {
 provideWetCatFood: (cat: Cat) => Food;
 provideDryCatFood: (cat: Cat) => Food;
 provideDogKibble: (dog: Dog) => Food;
}

interface Dog {
 type: 'DOG'; breed: DogBreed; age: number; weightKg: number;
}

interface Cat {
 type: 'CAT'; breed: CatBreed; age: number;
}

type Pet = Cat | Dog;
```

Typescript knows that `Pet` objects can only be `Cat`s or `Dog`s, and nothing else. It also knows that all `Pet` objects have a common discriminating property ( `type` ) which it can use to tell different `Pet` types apart.

This means that within the `case 'CAT':` block, the type of the `pet` variable is actually `Cat` , and we can pass `pet` to functions which take `Cat` s as a parameter. This means we get similar behaviour to the pattern-matching in the C# switch statement.

Secondly, we get compile-time checking (and code completion!) on those `'CAT'` and `'DOG'` strings, since typescript knows that `pet.type` must be one or the other. In general, working with “stringly-typed” code is much nicer in typescript than C# and other languages, because constant values such as strings and numbers are part of the type system.

Thirdly, we get exhaustiveness checking on the switch statement. Adding a third type to the `Pet` union would cause the compiler to notice that we can fall out of the bottom of the `switch` statement (and therefore the function) without returning a value. This would mean that typescript infers the return type of the function as `Food[] | undefined` , which is a mismatch against the declared return type of `Food[]` — causing a compile error. (For functions that don’t return a value, we can [add an explicit check](https://www.typescriptlang.org/docs/handbook/advanced-types.html#exhaustiveness-checking) that `pet` will have the special type `never` at the bottom of the function).

---

Typescript is still far from a perfect language — I still encounter code on a semi-regular basis that shouldn’t typecheck and does, which can be frustrating. But it’s still a fun and productive language, and is [being worked on all the time](https://github.com/Microsoft/TypeScript/wiki/What%27s-new-in-TypeScript). If you were unfamiliar with Typescript before, I hope you give it a try at some point!
