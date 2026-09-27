---
title: Better living through git aliases
original: https://blog.nyctef.com/post/111489636947/git-aliases
date: 2015-02-19T14:28
---

SourceTree is too slow. GitExtensions is fast, but too ugly. GitHub for Windows is pretty, but too simple. `git` is very powerful, but a massive mess of inconsistent and overly-verbose commands.

(See `hg` for what a well-designed commandline looks like. But I digress)

The point is, the git commandline is actually reasonably easy to fix using [aliases](http://git-scm.com/book/en/v2/Git-Basics-Git-Aliases). Once you have a sensible set of aliases, you can be reasonably productive with the git commandline compared to using one of the UIs listed above.

I'm going to take you through some of the aliases I've created so far, but I recommend sticking with the default git commands and only introducing aliases as you see fit. One of the great things about aliases is they can become completely personal to the way you want to work.

Simple commands made shorter:

- `st = status`
- `ci = commit --verbose`
- `fa = fetch --all`
- `co = checkout`
- `di = diff --word-diff`
- `amend = commit --amend`
- `aa = add -A`

and of course

- `lg = log --graph --abbrev-commit --decorate --date=relative --format=format:'%h%C(reset) - %C(bold green)(%ar)%C(reset) %s%C(reset) %C(bold green)- %an%C(reset)%C(bold yellow)%d%C(reset)'`

for a useful log command.

These are fairly explanatory. You can combine these with other options, or make variants of the aliases like so:

- `cia = commit --verbose -a`
- `cip = commit --verbose -p`
- `dc = diff --cached --word-diff`
- `fap = fetch --all --prune`
- `cob = checkout -b`

Remember to `fap` regularly for a healthy repository ;)

- `p = pull --ff-only`

[Git pull is broken.](https://felipec.wordpress.com/2014/05/27/is-git-pull-broken/) Always fetch changes and merge them separately when it's non-trivial to do so.

- `fomm = fetch origin master:master`

This lets you do a fast-forward on master while a different branch is currently checked out. Useful when you want to integrate master into whatever feature you're working on.

- `dlast = diff HEAD^ HEAD --word-diff`

AKA "did I really just commit what I think I did?" for those moments of forgetfulness

- `outgoing = !git lg FETCH_HEAD..`
- `incoming = !git fetch && git lg ..FETCH_HEAD`
- `outin = !git fa && git lg --left-right ...FETCH_HEAD`

Some commands I really missed from mercurial - letting you know of outgoing and incoming changes on your branch. This can tell you what commits are safe to rebase, as well as warn of any upcoming merge trouble. (Personally I have these abbreviated to `out` and `in`).

- `addw = !git diff -b | git apply --ignore-whitespace --cached`

Short for "add-whitespace-insensitive": add all non-whitespace changes to the index. Really useful when Visual Studio decides to flip all the line endings for the sixth time this morning.

- ``puom = !git push -u origin `git rev-parse --abbrev-ref HEAD` ``

For that first push of a new branch to origin, when git insists you name your branch a second time. Just to be sure.

- `` delete-old-branches = !git branch -D `git branch --merged | grep -v '\*\|master' ` ``

Delete branches that have been merged into the current branch (apart from the current branch and master)

A side note: If you're working on windows, there's a couple of things you'll want in order to make the commandline actually pleasant to use. The first is a decent shell. This used to be Cygwin, but fortunately a lot of git distributions are now shipping with Git Bash, which is a decent bash shell without all the hassle. The second is a decent console - personally, I use ConEmu, but there are a bunch of console alternatives. Just don't use the default Windows console - it hasn't changed a bit in something like twenty years, and it really shows.

Other useful links:

- http://haacked.com/archive/2014/07/28/github-flow-aliases/
- https://git.wiki.kernel.org/index.php/Aliases
