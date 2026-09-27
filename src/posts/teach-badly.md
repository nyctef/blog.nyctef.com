---
title: How to teach things badly
original: https://medium.com/ingeniouslysimple/how-to-teach-things-badly-e2c4bce55fe2?source=friends_link&sk=72c65fb87db27941f9cee66adbe03e5f
date: 2021-04-27
---

![A chessboard showing various pawn moves, explained in image caption.](https://cdn-images-1.medium.com/max/800/1*9IEsR5rzJdCrJ44m07rWEw.png)

<small>A quick primer on pawns. Pawns generally move forwards one square at a time, with two exceptions: their first move can be two squares, and they can capture opposing pieces by moving one square diagonally.</small>

Today’s idea isn’t directly technical, but by the end it should hopefully be clear how it can apply to programming and software development in general.

Recently I’ve been caught up in watching chess videos on Youtube. I’ve never been particularly interested in chess, but a [handful of videos](https://www.youtube.com/watch?v=gJbiguzwiwE) have made it really interesting.

At some point I ended up being curious about a weird old chess rule I remembered called [“_en passant_”](https://en.wikipedia.org/wiki/En_passant) (a French word, so pronounced very roughly like “ahn passahn.”)

Whenever I’ve read about _en passant_ before, it’s been a list of rather arbitrary-sounding rules like this:

> A pawn on its fifth rank may capture an enemy pawn on an adjacent file that has moved two squares in a single move. The conditions are:
>
> - the capturing pawn must be on its fifth rank;
> - the captured pawn must be on an adjacent file and must have just moved two squares in a single move (i.e. a double-step move);
> - the capture can only be made on the move immediately after the enemy pawn makes the double-step move; otherwise, the right to capture it _en passant_ is lost.

**Hopefully, at this point, you’re as confused as I was.** The way these rules are described is very technical and precise, but doesn’t at all help us understand the rule itself. It makes _en passant_ [feel like a glitch or a bug](https://www.chess.com/article/view/his-pawn-cheated-and-killed-my-pawn), rather than an intentional rule. Why does this thing even exist? Is it just an unnecessary complication?

Often the way we teach concepts feels a lot like this: a list of arbitrary rules, with no context or explanation. Badly-commented code can also put us in a similar situation. It’s certainly possible to get across the essential facts this way, but we’re doing ourselves an injustice.

---

[Further down the wikipedia article](https://en.wikipedia.org/wiki/En_passant#Historical_context), we see some historical context:

- In earlier versions of chess, pawns could only move one square at a time.
- At some point, around the thirteenth to sixteenth century, people changed the rules so that a pawn’s first move could be two squares instead. _(Presumably to speed up the early game and make it more interesting? Would be fascinating to know more here.)_
- However, this two-square move potentially allows pawns to evade captures that would have happened, had they moved one square at a time.
- The _en passant_ rule was introduced to correct this perceived injustice.

This historical context is much more interesting than the list of conditions above, **and** it allows us to figure out the _en passant_ rule for ourselves, from scratch! We could come up with something like the following:

> - If an enemy pawn moves by two squares, skipping over a square in the middle, 
> - And we have a pawn that could have captured that skipped middle square,
> - Then, on our next turn, we have the option to move our pawn to that middle square and capture the enemy pawn.

This set of rules is much less precise than the ones above, but much more intuitive. I hope you’ll agree that this extra context makes it much clearer both why the rule exists, and how we could apply this rule in a chess game.

Teaching _why_ something is a particular way is often more important than teaching the thing itself! When we understand the reasons that particular rules exist, then we can figure out the rules for ourselves. More importantly, we can see when the context for those rules might have changed.

Of course, the rules for chess are unlikely to change any time soon. But when working on software (or many other fields) we come into contact daily with decisions, architectures or design patterns that impose similar kinds of rules. Knowing the context for these rules — especially the original goals that the rules were supposed to implement — [allows us](https://en.wikipedia.org/wiki/G._K._Chesterton#Chesterton%27s_fence) to be much more _deliberate_ when making decisions.

![Diagram of a chessboard with an en passant move highlighted](https://cdn-images-1.medium.com/max/800/1*DU9JtqtZ66PBwP2Own-UQw.png)
