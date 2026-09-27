---
title: Removing boilerplate with Typescript
original: https://medium.com/ingeniouslysimple/removing-boilerplate-with-typescript-b2cfe3bc461b?source=friends_link&sk=1498512cfd3e216ffb88181fcd1fa5df
date: 2019-11-12
---

Let’s say we have an api object we want to inject into our code. We also want to test this code, so we need to define the interface for our api object so that we can create appropriately-shaped mock objects. We want the compiler to check that our mock object at least implements the same methods as the real api.

Coming from C#, my first attempt at this looks like a traditional interface with two different classes to implement it:

```
interface Api {
  loadProject: (projectPath: string) => Promise<ProjectDetails>;

  getLogger: () => (message: string) => void;

  generateMigrationScripts: (
    comparison: ComparisonResult,
    selectedObjects: string[]
  ) => Promise<MigrationScript>;

  setClipboardText: (text: string) => void;

  // ... and about 20 more methods
}

class ApiImpl implements Api {
  logger: (message?: any, ...optionalParams: any[]) => void;

  constructor() {
    this.logger = console.log;
  }

  loadProject = async (path: string) => {
    return parseFile(await readFileAsync(path));
  };

  getLogger = () => this.logger;

  generateMigrationScripts = async (
    comparison: ComparisonResult,
    selectedObjects: string[]
  ) => {
    return await { migrationScript: "some migration text" };
  };

  setClipboardText = (text: string) => {
    electron.app.clipboard.setText(text);
  };

  // ... and so on
}

class MockApi implements Api {
  loadProject = () => Promise.resolve({});
  getLogger = () => console.log;
  generateMigrationScripts = () => Promise.resolve({});
  setClipboardText = () => {};
}
```

[We don’t actually need a class here, though](/posts/typescript), so we can eliminate a bit of boilerplate syntax with an object literal and a plain factory function:

```
interface Api {
  loadProject: (projectPath: string) => Promise<ProjectDetails>;

  getLogger: () => (message: string) => void;

  generateMigrationScripts: (
    comparison: ComparisonResult,
    selectedObjects: string[]
  ) => Promise<MigrationScript>;

  setClipboardText: (text: string) => void;

  // ... and about 20 more methods
}

const createApi = () => ({
  loadProject: async (path: string) => {
    return parseFile(await readFileAsync(path));
  },

  getLogger: () => console.log,

  generateMigrationScripts: async (
    comparison: ComparisonResult,
    selectedObjects: string[]
  ) => {
    return await { migrationScript: "some migration text" };
  },

  setClipboardText: (text: string) => {
    electron.app.clipboard.setText(text);
  }

  // ... and so on
});

const MockApi: Api = {
  loadProject: () => Promise.resolve({}),
  getLogger: () => console.log,
  generateMigrationScripts: () => Promise.resolve({}),
  setClipboardText: () => {}
};
```

There’s a much bigger change we can make, though. Currently adding a new api function means parallel changes in both the interface and the `createApi` methods. Using `infer`, we can tell typescript that the `Api` type is just whatever `createApi` returns:

```
type Api = ReturnType<typeof createApi>;

const createApi = () => ({
  loadProject: async (path: string) => {
    return parseFile(await readFileAsync(path));
  },

  getLogger: () => console.log,

  generateMigrationScripts: async (
    comparison: ComparisonResult,
    selectedObjects: string[]
  ) => {
    return await { migrationScript: "some migration text" };
  },

  setClipboardText: (text: string) => {
    electron.app.clipboard.setText(text);
  }

  // ... and so on
});

class MockApi implements Api {
  loadProject = () => Promise.resolve({});
  getLogger = () => console.log;
  generateMigrationScripts = () => Promise.resolve({ migrationScript: "" });
  setClipboardText = () => {};
}
```

---

There’s a lot happening on that first line, so let’s unpack it a little. We take a reference to `createApi`, and change the value to a type with `typeof createApi`. Even though we haven’t actually specified `createApi`‘s type anywhere, typescript can infer what it is by looking at the parameters it takes and the object it returns. We only care about the return type of the function, though, so we can extract the return type using `ReturnType<T>` and save it as a type called `Api`.

Here’s a (slightly simplified) definition of `ReturnType<T>` , so we can see how it works:

```
type ReturnType<T>= T extends (...args: any) => infer R ? R : never;
```

This is a lot to unpack, so let’s take it step by step.

The first thing to notice is the `extends` keyword, which means we’re using [conditional types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html). That means we can declare something like this:

```
type ConditionalType<T> = T extends Foo ? Bar : Baz;
```

Here we’re saying that the type `ConditionalType<T>` is different depending on the type `T`. If `T` is assignable to `Foo`, then `ConditionalType<T>` is `Bar`, otherwise it is `Baz`.

The second thing is what we’re checking for: `T extends (args) => infer R`. We’re checking whether `T` is a function or not. Instead of specifying the return type we want, we’re saying `infer R`. [The `infer` keyword](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types) puts a hole in the type definition and asks typescript to fill it in for us.

Finally, we say that if the type matches then the result of the conditional type is `R` — the return type that we inferred. If the type doesn’t match (ie, `T` isn’t a function) then the result is `never` — [a special type that can never be instantiated](https://basarat.gitbooks.io/typescript/docs/types/never.html).

---

The upshot of all this type magic is that we no longer need to keep a separate interface and implementation in sync for any code which depends on `Api`. As soon as `createApi` returns a new property on the api object, typescript will verify that `MockApi` matches the new type and ensure that our tests keep behaving. We’ve gained a whole lot of type checking power with very little boilerplate compared to the native JS code.

![](https://cdn-images-1.medium.com/max/800/1*N0cmeZdn8tzdevdjEwPU5A.png)
