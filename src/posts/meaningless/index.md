---
title: Being deliberately meaningless
original: https://medium.com/ingeniouslysimple/being-deliberately-meaningless-c6014ec3446f?source=friends_link&sk=fbc3e180e8141e957a95dc779dc5b7e7
date: 2020-03-31
---

A quick one today: just a common thread between a bunch of different ideas.

### …in examples

[Metasyntactic variables](https://en.wikipedia.org/wiki/Metasyntactic_variable) (foo, bar, baz, etc) are an obvious example of being deliberately meaningless. Using them generally communicates to the reader that the code is an example, and the reader is expected to fill in the gaps.

When these variables work well, they avoid providing distracting detail, and let the user spot what is important. This works best when the example is talking about the structure of some code, rather than specific implementation details.

Some people have [criticized](https://dev.to/warrend/no-more-foo-bar-and-baz-56j4) the use of these “standard” meaningless variables as being _too_ abstract, and I think they often have a good point. Consider other conventions which are meaningless in a programming context, but meaningful to the reader. Some examples are [Monty Python references](https://docs.python.org/3.8/tutorial/inputoutput.html) in the python docs, [cats and dogs](https://medium.com/ingeniouslysimple/how-language-features-affect-oo-design-237cfc850752) in various OO tutorials, and even Shakespeare scripts in [the XMPP specs](https://xmpp.org/extensions/xep-0045.html):

> 4.3 Dramatis Personae  
> Most of the examples in this document use the scenario of the witches’ meeting held in a dark cave at the beginning of Act IV, Scene I of Shakespeare’s **Macbeth**, represented here as the “coven@chat.shakespeare.lit” chatroom.  
>  — [https://xmpp.org/extensions/xep-0045.html](https://xmpp.org/extensions/xep-0045.html) (the group chat spec)

Example 89, kicking a user, actually uses a line from Henry V. The different styles of writing here make it clear which bits of text are part of the spec, and which are part of the example:

```
<iq from='fluellen@shakespeare.lit/pda' id='kick1'
    to='harfleur@chat.shakespeare.lit' type='set'>
  <query xmlns='http://jabber.org/protocol/muc#admin'>
    <item nick='pistol' role='none'>
      <reason>Avaunt, you cullion!</reason>
    </item>
  </query>
</iq>
```

An important point: while readers who are vaguely familiar with Shakespeare will benefit, the specs **do not require any knowledge of Shakespeare** to be understood properly.

### …in test code

This isn’t particularly surprising, since test code is really another way of specifying examples. But it’s additionally useful for the test as well as the reader, since meaningful data might imply extra logic that the code under test has to implement. By using [meaningless data](https://github.com/testdouble/contributing-tests/wiki/Meaningless-Test-Data), we can show that the code knows less about the data being passed in — and **dumber code is usually better**. I’ve written more in [an earlier blog about refactoring test code](https://medium.com/ingeniouslysimple/should-you-refactor-test-code-b9508682816).

### …and in production code?

Sometimes when typing code we end up with intermediate values that we can’t name yet. Just picking a meaningless name is a good idea for these, so long as you come back to them later. Similarly when refactoring code, we often end up extracting variables or methods to try and introduce new concepts. [Arlo Belshee makes the point](https://www.deconstructconf.com/2017/arlo-belshee-i-find-bugs-too-boring-to-write) that we should call extracted things like this `CreatesReports_OrSomething` to show that we’re not quite sure what the original code was intended to do: **deliberate ambiguity is better than false clarity**. Once we’re more confident in the code we’re mucking around with, we can name things more normally,

I’ve noticed a pattern that crops up when leanding more towards functional programming in C#: Many classes end up as big bags of static functions rather than actual objects. It’s tempting to give these classes “real” OO names like `ObjectComparer`, but much more generic, less meaningful names like `Comparison` end up working better. Compare the redundancy in a name like `ObjectComparer.CompareObjects(x, y)` vs `Comparison.CompareObjects`. C# also has a static import feature which means you can skip these meaningless names.

And finally, sometimes names are just too small to be meaningful. This seems to be especially common in anonymous functions. A line of code like `list.sort(x => x.StartDate)` means “sort list by start date” and everything else is boilerplate. The type or value of `x` doesn’t matter — all that’s important is that it’s something with a `StartDate` field.

### Conclusions?

Hopefully this has been a set of interesting ideas. The main thing I’ve learned from writing this down is the continued importance of **being deliberate** rather than only following rules. Be as meaningful as possible when writing code most of the time, but always be aware of those cases where you might need to communicate a lack of meaning.

![](./1-KA_UQSn9M3mQMPCp74fPlA.jpeg)

Photo by [Lucian Dachman](https://unsplash.com/@luciandachman?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText). It doesn’t mean anything.
