---
title: Typescript “casts” are not casts
original: https://medium.com/ingeniouslysimple/typescript-casts-are-not-casts-4c6c954749c4?source=friends_link&sk=7696681eb8c2871e1bd0d8d69b844dab
date: 2021-09-16
---

At Redgate we recently ran an internal typescript training course, and I wanted to highlight a common misconception I saw a couple of times.

To explain what I mean, let’s compare some similar-looking code in C# and typescript. In C#, we can use the `as` operator (sometimes called a “safe” cast) to check the type of an object:

```
public void HandleEvent(object sender, Event event) {
    var ourEvent = event as OurCustomEventType;
    if (ourEvent != null) {
        // ... handle event
    }
}
```

Alternatively, we can also use a cast expression (or “explicit” cast) to throw an `InvalidCastException` if the cast fails:

```
var publishedDate = (DateTime)metadata["publishedDate"];
Console.WriteLine("Document published on " +
    publishedDate.ToString("MMMM dd, yyyy"));
```

The important part is that **these casts happen at runtime**: the C# compiler emits instructions to:

- check whether the variable has the correct type,
- perform any appropriate conversion operations (eg [boxing or unboxing an object](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing), [converting one type of number to another](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/numeric-conversions#explicit-numeric-conversions), or running [user-defined conversions](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/operators/user-defined-conversion-operators)), and
- handle cast failures and respond appropriately (returning `null` or throwing an `InvalidCastException`).

---

**Typescript, however, does none of these things**. If you’re coming to typescript from another language, you may be surprised to find out that your intuition about casts doesn’t apply here.

While typescript [has syntax that looks like casts](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions), these are actually “type assertions” instead. Let’s take the first example, and write something like it in typescript:

```
const handleEvent = (sender: object, event: Event) => {
    const mouseMove = event as MouseEvent;
    console.log(`Mouse moved to ${mouseMove.x},${mouseMove.y}`);
}
```

This looks very similar to the first C# example — indeed, the syntax is almost identical. But if we [take a look at the typescript playground](https://www.typescriptlang.org/play?#code/MYewdgzgLgBAFgQzAEwDYFMCiA3dZYC8MAFBHsugE4BcMIARgFbrBQA0M6u+tOeUAShgEAfDADeAKBgyYoSLAC2IAK5kAsiFzDO3WAggxNarHoDc02fIggMAOlQgA5sQAGxsjGW5kMKCBgAEnFlE01cOwAPAF82YNCNLXQ7AE9o1wELaKA), we can see that our code actually compiles to the following javascript:

```
    const mouseMove = event;
```

and the type assertion has disappeared completely. Type assertions always succeed. They’re a way for you to tell the typescript compiler “Suppress errors here, I know what I’m doing” which can be useful, but is **more dangerous than you might expect**. If you’ve cast to a type with more properties than the object actually has, then any later code will assume those properties exist — and you might see errors caused by impossible-looking `undefined` values.

Are type assertions completely unsafe? There is some minimal type checking for “unrelated” types. If the source type has nothing in common with the target type, then typescript will complain:

```
interface Cat {
    numLives: 9;
}

interface Dog {
    bark: () => void;
}

const animal = { bark: () => {} } as Cat
// ^ fails with an error: Conversion of type '{ bark: () => void; }' to type 'Cat' may be a mistake because neither type sufficiently overlaps with the other.
```

However, if we tried to compile `{ } as Cat` , then typescript wouldn’t complain — because `{ }` is a subset of the `Cat` interface.

---

So when should you use type assertions? I’d say the answer is **as little as possible**. Here are a couple of situations where they can be necessary:

- <b>When you genuinely know better than the compiler</b>  
   For example, `Object.keys` and `Object.entries` return stringly-typed keys instead of `keyof typeof obj`, because [any object with more properties can satisfy that interface](https://github.com/Microsoft/TypeScript/issues/12870). But if that’s unlikely to happen in your specific code, then you can cast it back to the more specific string union type to get better type safety later on:

  ```
  for (const [key, value] of Object.entries(dataRow)) {
      renderCell(getHeaderIcon(key as keyof ModelType), value);
  }
  ```

- <b>When handling external data</b>  
   If you’re receiving an external object from a web request or `JSON.parse()`, you probably already know what shape you expect the data to be in. If possible, you should implement type guards (or use [a library like](https://github.com/gcanti/io-ts) `[io-ts](https://github.com/gcanti/io-ts)` which automates a lot of runtime checking). But this may be overkill for many projects, and it’s a lot easier to just stick in a type assertion — especially since it’s an improvement over propagating the `any` type!
- <b>\*When mocking large objects in a test</b>  
   In test code, we can sometimes afford to be a little sloppier with types, because we’re not risking production code breaking, and we really care whether the test passes or not. For example, a mocked `fetch` call returns a `Response` object with [a couple dozen properties](https://developer.mozilla.org/en-US/docs/Web/API/Response) but we might only care about calling `.json()`. In that case we need the type assertion just to satisfy typescript, even though we know it’s incorrect:
  ```
  const result = { success: false, error: "Something exploded!" };
  window.fetch = jest.fn().mockReturnValueOnce(
      Promise.resolve({
          json: async () => result
      } as Response)
  );
  ```

---

So, to sum up: typescript type assertions may be more dangerous than you may think, and you should avoid them if possible. But sometimes they turn out to be necessary! The important thing, as always, is to be properly informed about how they work and to make deliberate decisions when writing code.

![](https://cdn-images-1.medium.com/max/800/1*cbPu9oGHe1sGSdO9rM8eKw.png)

Original photo by [Tom Claes](https://unsplash.com/@tomspentys?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/cast?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)
