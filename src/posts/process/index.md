---
title: Process is an excuse to not think
original: https://medium.com/ingeniouslysimple/process-is-an-excuse-to-not-think-f0d653ac838f?source=friends_link&sk=2e98a293aa7636dc25c26c3cc709f352
date: 2023-03-10
---

What is “process”?

Let’s say process is a rule that you follow instead of independently deciding what to do.

For example, daily standups are a process: everyone agrees to meet up at a certain time each day rather than arranging ad-hoc catchups.

Another example of process is code style: we generally agree on some rules for naming variables, formatting code, etc. And we often implement those rules via some kind of automated linter. The idea is to avoid wasting time going back and forth on every individual decision.

**So: a big benefit of process is that it helps avoid bikeshedding.** Process helps keep work flowing when the stakes are low and some decision is better than none.

Process can also have a benefit in times of urgency when the stakes are high, as well. For example, imagine some team working on a business-critical system. They might have a rule which states that all changes must be test-driven before they can be accepted into production. During an outage, the team may be pressured into hacking a quick (but hopefully correct) fix without going through the usual procedures. But if the team believes in the process that they’ve agreed with their stakeholders, they’ll still take the time to make sure the fix is correct rather than gambling on ending the outage earlier. **Process can keep us honest when times are tough.**

But what are the downsides of process? I think the clue is in some of the above examples — **process replaces independent thought**:

- If a process becomes so detailed that it appears to cover every possibility, then people may stop looking for other problems that could arise.
- The process itself can become the goal rather than the outcomes that it’s supposed to help with.
- If people fear the consequences of making a wrong decision, they may instead rely on the process to cover their ass, causing a so-called “[diffusion of responsibility](https://en.wikipedia.org/wiki/Diffusion_of_responsibility).”
- If the process gets in the way too much, then people will likely do the minimum required to satisfy the process, rather than thinking about what tasks actually need to get done.

Process needs to be relevant, appropriate and deliberate: for example, requiring review for every change to a codebase may be sensible, but requiring two separate people to sign off on some trivial release note update clearly isn’t. Figuring out when excuses or exceptions to the process are allowed is a tricky question to answer.

**So what’s the conclusion?** It may sound trite, but ultimately we need just the right amount of process: to help people avoid sweating the small stuff, to ensure they do the right thing when it really matters, and to empower people to take responsibility when their contributions are most valuable.

Getting there is the hard part :)

<figure>

![](./flowchart.jpg)

<figcaption>

[Photo by Kelly Sikkema](https://unsplash.com/photos/lFtttcsx5Vk)

</figcaption>
</figure>
