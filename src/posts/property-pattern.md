---
title: "Shapes, slots and traces: optimizing the property pattern"
original: https://dev.to/nyctef/shapes-slots-and-traces-optimizing-the-property-pattern-21c8
date: 2025-03-21
---

A common aspect of dynamic programming languages is the ability to create objects with arbitrary types, and to add or remove properties of these objects at runtime.

These objects are usually implemented as a hashmap (AKA a hashtable, dictionary or associative array). A hashmap provides amortized constant-time inserts, updates and deletes for properties in an object. However, despite a ton of research that has gone into making hashmaps as fast as possible, they still have substantial overhead due to the requirements to hash property names and search for the matching entries.

Even in statically typed programming languages, it is often useful to work with unstructured data. For example, in the schema comparison tool we're currently working on, we store the schema objects themselves as nested property bags. This means the core comparison code can be almost entirely generic—just comparing lists of named properties to each other—regardless of which database the schema objects came from.

Despite the massive expressive power of dynamic objects, it turns out that most objects in most programs end up looking very similar to each other. This insight means there's a bunch of possibilities for optimizing property access on objects—one of the most common operations in any language that has objects—and overcoming the overhead of the naive hashmap implementation.

I'm only scratching the surface of these optimizations here (and I'll probably get a bunch of the details wrong) but I've linked to some references + further reading that I found useful if you want to dive in more.

### Javascript: shapes

There are a lot of different Javascript runtimes, but most of them have a similar concept of tracking object shapes (inspired by "Hidden Classes" from the SELF language). Given some code like the following:

```js
const point = {};
point.x = 3;
point.y = 4;
```

which produces a `point` object with two properties, a naive implementation might store the object in memory something like this:

```
object point:
  - number of properties: 2
  - property 0: x
  - property 0 value: 3
  - property 1: y
  - property 1 value: 4
```

The first idea behind shapes is that the structure of an object can be stored separately from its contents, which is much more efficient when we have many copies of similar objects:

```
shape shapeA:
  - number of properties: 2
  - property 0: x
  - property 1: y

object point:
  - shape: shapeA
  - value 0: 3
  - value 1: 4

[... plus a lot more point values]
```

There's a lot more nuance about how shapes are discovered and tracked, which is explained in depth in the links below. For now, though, the other interesting aspect is "Inline Caches". For example, assuming we have a function like the following:

```js
function getX(point) {
  return point.x;
}
```

If we want to resolve the `.x` property on the incoming object, we now have to follow the `shape` pointer on the object, and then look up the property descriptor in the list of properties on the shape. But this is still the same kind of slow hashmap lookup we've been trying to avoid! The next trick is to reserve a bit of space in the bytecode to cache shape of the last object that was passed into the function. Then the function gets compiled into something like the following:

```js
function getX(point) {
  if (point.shape === shapeA) {
    // a fast pointer comparison
    return point.values[0]; // directly index into the object's values
  } else {
    // ... slow path: look up `x` property in `point.shape`
    //     (and then update the cache)
  }
}
```

The inline cache starts out empty, and gets updated when an object with a different shape passes through the function. (For example, the resulting code might compare against `shapeC` and access object index `.3` instead).

Since the majority of objects passed into this `getX` function probably have the same shape, this turns out to be a useful optimization.

#### references

- https://mathiasbynens.be/notes/shapes-ics
- https://web.archive.org/web/20201124042930/https://channel9.msdn.com/Shows/Going+Deep/Expert-to-Expert-Erik-Meijer-and-Lars-Bak-Inside-V8-A-Javascript-Virtual-Machine

### Python: `__slots__`

Shapes in Javascript relies on the runtime automatically detecting "hidden classes" during the program's execution, but Python is more explicit.

By default, every python object has a hashmap attached (named `__dict__`) where the object's properties are stored. Arbitrary properties can be added and removed from objects later:

```python
class Foo():
    pass

foo = Foo()
foo.bar = 3
print(foo.__dict__) # prints {'bar': 3}
```

To optimize memory usage and potentially improve performance, Python provides the `__slots__` declaration. By defining `__slots__` in a class, you can explicitly declare data members (like properties) and prevent the creation of the default `__dict__` for each instance. This can save memory and make attribute access faster because the properties are stored in a more compact structure.

Here's an example:

```python
class Foo():
  __slots__ = ['bar']

foo = Foo()
foo.bar = 3
print(foo.bar)  # prints 3

foo.baz = 4 # AttributeError: 'Foo' object has no attribute 'baz'
print(foo.__dict__) # AttributeError: 'Foo' object has no attribute '__dict__'.
```

It's hard to tell exactly how much slots speeds up attribute access, and reports vary. In particular the cpython bytecode for slots vs non-slots is the same:

```python
def get_bar(obj):
    return obj.bar

print(get_bar(foo)) # prints 3

import dis
dis.dis(get_bar) # disassemble the bytecode of `get_bar`
# prints the following:
"""
  2           0 LOAD_FAST                0 (obj)
              2 LOAD_ATTR                0 (bar)
              4 RETURN_VALUE
"""
```

here `LOAD_FAST` puts the first parameter on the stack, `LOAD_ATTR` calls `getattr(top_of_stack, "bar")` and `RETURN_VALUE` returns the top of the stack out of the function.

The implementation for `getattr` ultimately ends up going down different paths based on whether it needs to look up an attribute in `__dict__` or in slots.

#### references

- https://tenthousandmeters.com/blog/python-behind-the-scenes-6-how-python-object-system-works/
- https://docs.python.org/3/reference/datamodel.html#slots
- https://medium.com/@stephenjayakar/a-quick-dive-into-pythons-slots-72cdc2d334e
- https://python-history.blogspot.com/2010/06/inside-story-on-new-style-classes.html
- https://docs.python.org/3.10/library/dis.html#opcode-LOAD_ATTR

### LuaJIT: traces

LuaJIT is a Just-In-Time (JIT) compiler for Lua that uses a technique called tracing to optimize code execution. Unlike many JIT compilers which compile a method at a time, tracing JIT compilers work by recording the operations performed during the execution of "hot" loops or frequently executed code paths. These traces can span across many methods and layers of abstraction, making optimizations such as devirtualization much easier than they would be otherwise. Once a hot path is identified, the JIT compiler generates optimized code for that specific path, which can then be executed much faster than the original interpreted code.

In LuaJIT, traces are sequences of instructions that represent the execution flow of a program. When a loop or function is executed multiple times, LuaJIT starts recording a trace of the operations performed. This trace is then compiled into highly optimized asesembly. The trace will largely be linear, with lots of guard clauses on conditionals checking that the current execution of the code is going down the same path as the trace. If any of these guard clauses fail, LuaJIT can fall back to the interpreter (which may cause new traces to be recorded) or continue with a side trace.

Tracing JIT vs more traditional method-based JITs are an interesting tradeoff. Since the traces that LuaJIT records generally don't have branches, and can span across wide areas of code, a lot of optimizations become much easier or trivial. On the other hand, the runtime can spend a long time interpreting bytecode and recording data before it's able to start compiling traces, so warmup time is much worse. Tracing JIT can also perform poorly in situations where branches are hard to predict. Some browsers have moved away from tracing JIT as a result, while others are using "meta-JIT" frameworks that combine per-method and tracing JITs at various levels of optimization.

For our purposes, we're interested in how LuaJIT optimizes constant attribute lookups. Let's take a look at some lua code this time:

```lua
point = { x = 3, y = 4 } -- this defines a table with two named attributes

function getX(point)
  return point.x
end
```

Since `x` is a constant attribute in this case, LuaJIT can emit a `HREFK` ("constant hash reference") opcode into its IR while compiling. The IR is what then gets transformed into machine-specific assembly code. The trick is that the `HREFK` instruction also includes the number of the slot in the table's hashmap where the entry is expected. If the key stored in that slot matches the expectation, then the program can skip the entire hash lookup algorithm and the trace can continue. Otherwise, the program will fall back to the slow path.

LuaJIT includes tools (particularly `-jdump`) that we can use to inspect the recorded trace, along with the IR and machine code that gets generated for it:

```bash
luajit -jdump -e "
point = { x = 3, y = 4}

function getX(point) return point.x; end

for i=1,1000000 do getX(point) end -- a big loop to force a trace to happen
"
```

#### references

- https://stackoverflow.com/questions/20266523/how-does-luajits-trace-compiler-work
- https://www.freelists.org/post/luajit/How-does-LuaJITs-trace-compiler-work,1
- http://lua-users.org/lists/lua-l/2009-11/msg00089.html
- https://blog.cloudflare.com/luajit-hacking-getting-next-out-of-the-nyi-list/
- https://github.com/tarantool/tarantool/wiki/LuaJIT-SSA-IR#memory-references
- https://github.com/LuaJIT/LuaJIT/blob/538a82133/src/lj_record.c#L1465-L1478
- https://pypy.org/posts/2025/01/musings-tracing.html

### What should you use?

Given all of the above, it's unlikely that you're optimizing your own programming language (and if you are, you could probably do a better job writing this blog post! :)

In cases like a schema comparison tool, though (where we're storing objects as property bags but have some additional knowledge about their structure) there's a lot of potential improvements that can be done by implementing something similar to `__slots__` in Python.

It's not a critical performance improvement right now (hashmaps are already pretty fast, after all) but it's definitely something I want to keep an eye on.

#### Other references:

On the property pattern in general:

- https://steve-yegge.blogspot.com/2008/10/universal-design-pattern.html
