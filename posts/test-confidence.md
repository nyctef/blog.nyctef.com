---
title: Testing and the confidence pyramid
original: https://medium.com/ingeniouslysimple/testing-and-the-confidence-pyramid-9ccf43582389?source=friends_link&sk=7761950036f1aec6e795e795c34f2a36
date: 2019-02-21
---

![](https://cdn-images-1.medium.com/max/1200/0*IWm666YkWoYoTUQU.jpg)

### Testing and the confidence pyramid

Much has been written about the classical test pyramid. The basic idea is straightforward — try to write more fast, isolated tests and fewer slow, integrated tests:

![](https://cdn-images-1.medium.com/max/800/0*RUqiEN6c-QcHPfvW.png)

The basic test pyramid, from [https://martinfowler.com/articles/practical-test-pyramid.html](https://martinfowler.com/articles/practical-test-pyramid.html)

Is this always the approach we should adopt, though? People have pointed out that the standard three-layer model isn’t appropriate for a lot of projects, and there are differing opinions on whether the middle layers [should be scrapped](https://github.com/testdouble/contributing-tests/wiki/Testing-Pyramid) or [brought back](https://www.mountaingoatsoftware.com/blog/the-forgotten-layer-of-the-test-automation-pyramid).

In the end, the only real consensus seems to be that “it depends”: on your product, your codebase, your team and your needs; and that we should probably be asking different questions:

> The problem with the test pyramid model is that it focuses on the wrong thing. It reasons in terms of how tests are implemented, rather than what features the tests are testing, or why we are writing the tests in the first place.  
>  — [https://johnfergusonsmart.com/test-pyramid-heresy/](https://johnfergusonsmart.com/test-pyramid-heresy/)

---

For this article I want to take a step back and reexamine the testing pyramid from a developer perspective: why do I care about any of this in the first place?

One image I found particularly useful was [@noahsussman’s idea of inverting the testing pyramid into a bug filter](https://twitter.com/noahsussman/status/836612175707930625) — trying to catch as many bugs as possible, as fast as possible.

I want to generalize the testing pyramid out into something I’m calling the “confidence pyramid”, although it’s not so much a pyramid any more as a series of filters. The basic idea goes something like this:

1. Whenever we add or make a change to some code, we need to ask what impact that change will have had: what could it break?
2. Once we’ve done an (extremely quick) risk assessment for the change, we need to perform some corresponding confidence-generating activity.
3. Once we have confidence again, that we know the change is probably correct and we can keep on coding.

This may sound like a lot of process, but I think we already do this implicitly a lot of the time. If you’re doing TDD for example, you may already be familiar with one form of this process — we write tests so that we can generate confidence by running those tests after a change has been made.

> TDD is an awareness of the gap between decision and feedback during programming, and techniques to control that gap.  
>  — Kent Beck

This generalizes more widely than TDD, though: At the smaller scales, most code editors these days provide some kind of instant as-you-type feedback that the code syntax you’re typing is correct, and (unless you’re stuck with C++) we can usually compile or run programs in seconds to instantly generate some confidence in each change.

At larger scales, we might have some changes that simply can’t be tested in an automated fashion: we might have tests in place that check our understanding of the requirements, but we can’t be properly confident in some changes until a user has said it solves their problems. We’re always going to be crowd-sourcing at least some of our testing.

![](https://cdn-images-1.medium.com/max/2560/1*eCWnQUjXrV8hNJi2ch9s6Q.png)

A pipeline showing a progression of less-risky to more-risky changes, and a corresponding confidence-generating activity for each. Of course, this isn’t a universal truth — everyone ends up with a different version of this diagram in their heads.

This process generalizes TDD in another way, too: the (functional change / covered by unit tests) step doesn’t have to be an explicit test framework. So long as we have a clear expectation in our head, we can test that against some console output or some UI appearance. The main thing we care about is getting that feedback quickly — if it takes five minutes to run our manual test each time, we almost certainly want to create some sort of shortcut to confidence, whether that’s [a UI test bench](https://medium.com/ingeniouslysimple/isolated-testing-for-ui-components-with-test-benches-b0d55d23a3d8) or some more standard tests.

---

Of course, we don’t want to go through the full pipeline every time we make a change: we want the minimal activity which brings us back to “I know my program works as expected”. This means we need to have some concept of things that “couldn’t possibly have broken.”

[Arlo Belshee’s concept of zero-risk changes](https://www.deconstructconf.com/2017/arlo-belshee-i-find-bugs-too-boring-to-write) is particularly useful here: there’s a whole class of improvements we can make to code which we know won’t change any behavior. Beyond that, we mostly rely on existing test coverage to protect against breakages, or new tests written to make sure the code we create actually does what it’s supposed to. Sometimes it’s just common sense: changing some label text in the UI shouldn’t affect the behavior of any code (and if it does, we’d want to ask why).

If we know our codebase well, we might have built up a sense over time of which areas are risky to touch, and which areas are relatively safe. When we’re working in a risky area, we might have to do a bit more confidence generating than we would otherwise to convince ourselves that changes are correct. Alternately, high quality in the existing codebase provides a baseline level of confidence: meaning potentially less testing required in the long run.

---

So what conclusions can we draw from all of this?

- Probably the main takeaway is to be aware of which confidence generators you have available, and **be deliberate** about which confidence generators you apply and when: don’t just always fall back on manual testing for everything (and probably don’t always rely on TDD for everything, too).
- I think it’s generally accepted that we want to stay towards the left-hand side of the diagram as much as possible. We enjoy fast feedback cycles: the faster we can generate confidence, the faster we can carry on programming. Programming becomes much more fun when we can generate high levels of confidence from a test suite that runs in seconds.
- We do need to be careful about misplaced confidence: [focusing too tightly](https://en.wikipedia.org/wiki/Inattentional_blindness) on low-level tests and potentially missing breakages that have happened at higher levels. Fortunately, we usually have some CI server that’ll run all the tests and double-check our changes.
- In the end, you’ll need to figure out what your own testing pyramid should be — this may vary from team to team and product-to-product — and figure out how you’re going to generate confidence in the code you’re writing.

![](https://cdn-images-1.medium.com/max/1200/0*m6y6u5eIqUoqdeex)

---

_Header picture:_ [_Assembling a pyramid model for Blade Runner_](https://makezine.com/2015/07/27/inside-blade-runners-model-shop/)
