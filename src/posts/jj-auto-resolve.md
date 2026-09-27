---
title: Automatically resolve formatting conflicts with jj fix
original: https://dev.to/nyctef/automatically-resolve-formatting-conflicts-with-jj-fix-b92
date: 2025-04-04
---

Jujutsu (jj) is a git-compatible versioning tool. It makes working with git repositories much nicer, and also supports more advanced workflows that would be difficult or infeasible in git.

As an example, here's a situation I ran into earlier this week. Let's say we have a class called `Answer` which has diverged on two branches. On `main`, the class has been reformatted so that we're not indenting everything by the namespace:

```csharp
namespace MyApp;

internal class Answer
{
    public int GetAnswer()
    {
        return 54;
    }
}
```

while on a branch, the contents of the method have been changed:

```csharp
namespace MyApp
{
    internal class Answer
    {
        public int GetAnswer()
        {
            return 42;
        }
    }
}
```

If we run `jj log` in this situation, we might get output like the following:

```
$ jj log
@  tuwwzvyz nyctef 2 seconds ago b2c07c4d
│  (empty) (no description set)
○  kwuuwuwx nyctef 1 minute ago git_head() 7e2d3b10
│  correct answer
○  lwowvoox nyctef 2 minutes ago 975fb9af
│  another change on this branch
○  svwxvtuo nyctef 3 minutes ago 665dcf1b
│  some change on this branch
│ ◆ xnrtvtyn nyctef 6 minutes ago main 9fd679a9
├─╯  reformat files
◆  kqxstvxn nyctef 7 minutes ago 679659f2
│  previous commit history on main
~  (elided revisions)
```

A quick primer on the log output: `@` shows the change that we're currently editing, which is empty at the moment. After that the log shows the graph of previous changes. Changes marked with `◆` are considered to be immutable.

From left to right, the log shows:

- `○` is a node in the change graph
- `kwuuwuwx` is the _change_ ID. **When editing changes, the change ID stays consistent, but the underlying git commit ID will be updated**
- `nyctef` is the author of the change
- `1 minute ago` is the timestamp of the change
- `git_head()` or `main` show any references pointing to that change
- `7e2d3b10` shows the current git commit ID for the change.

In the real terminal output, the first few characters of the change and commit IDs will be bolded, showing the minimum unique prefix. This is handy when typing out these IDs in commands.

---

Let's say we want to try fixing the conflict. The choice between merging and rebasing is somewhat arbitrary, but jj has a really nice rebase command so let's show that off. All we have to do is

```sh
jj rebase --destination main
```

and the current branch relative to `main` will be put on top of it. Jujutsu also has a nice set of arguments for specifying the set of source revisions to move. **Compared to git, arguments are much more consistent between different commands, so they're much easier to remember as well.**

In git, we might expect this rebase to stop halfway through once it encounters the conflict. That's not what happens in Jujutsu, though:

```
$ jj rebase -d main
Rebased 4 commits onto destination
Working copy now at: tuwwzvyz 9031b581 (conflict) (no description set)
Parent commit      : kwuuwuwx bd4ca349 (conflict) correct answer
Added 0 files, modified 3 files, removed 0 files
There are unresolved conflicts at these paths:
Answer.cs    2-sided conflict
New conflicts appeared in these commits:
  tuwwzvyz 9031b581 (conflict) (no description set)
  kwuuwuwx bd4ca349 (conflict) correct answer
To resolve the conflicts, start by updating to the first one:
  jj new kwuuwuwx
Then use `jj resolve`, or edit the conflict markers in the file directly.
Once the conflicts are resolved, you may want to inspect the result with `jj diff`.
Then run `jj squash` to move the resolution into the conflicted commit.
```

If we re-run `jj log`, we can see that the rebase has actually happened:

```
$ jj log
@  tuwwzvyz nyctef 9 minutes ago 8d02a9f0 conflict
│  (no description set)
×  kwuuwuwx nyctef 9 minutes ago git_head() 5062af7d conflict
│  correct answer
○  svwxvtuo nyctef 9 minutes ago ec16ab36
│  another change on this branch
○  lwowvoox nyctef 9 minutes ago fab09cd9
│  some change on this branch
◆  xnrtvtyn nyctef 28 minutes ago main 9fd679a9
│  reformat files
~  (elided revisions)
```

However, our change (and its descendants) are now marked as `conflict`s in the log. **Jujutsu treats conflicts as a first-class object, and allows them to exist in the history.** This means we aren't forced to fix conflicts as soon as they appear, unlike for `git merge` or `git rebase`. We can take time to fix each problem when necessary and when we have the right information to do so. However, Jujutsu won't let us push commits that contain conflicts to github or another git repo, so we do have to fix them eventually.

We can also inspect the conflict itself by editing the file locally or using `jj show kw`:

```jj
$ jj show k --config ui.conflict-marker-style=git
    ...
   4    4: {
   5    5:     public int GetAnswer()
   6    6:     {
        7: <<<<<<< Side #1 (Conflict 1 of 1)
   7    8:         return 54;
        9: ||||||| Base
       10:         public int GetAnswer()
       11:         {
       12:             return 54;
       13:         }
       14: =======
       15:         public int GetAnswer()
       16:         {
       17:             return 42;
       18:         }
       19: >>>>>>> Side #2 (Conflict 1 of 1 ends)
   8   20:     }
   9   21: }
```

Here we can see that the conflict is particularly annoying, because parts of the `GetAnswer` function boilerplate are copied both inside and outside the conflict area. If we just try to solve this by picking one side or the other in some merge tool, we're going to end up with broken code. It's not too bad in this toy example, but this problem gets much worse in realistic code.

---

Having changes containing conflicts is a bit of a scary state, though, especially if you're new to Jujutsu. It's worth noting another of Jujutsu's killer features: **you can undo any operation using `jj op undo` and get the repo back to the previous state.** If you want to go back further in the history, then you can use `jj op log` and `jj op restore <revision>` to get there. This is like a supercharged version of git's `reflog` command, and it works way more reliably.

If we ran `jj op undo` after the above rebase, and then ran `jj log` again, we would see that we're back in the original state with two branches and no conflicts.

---

The root of our troubles are the formatting changes on `main`: we'd be able to easily resolve the conflicts if those formatting changes were consistently applied to all the changes on our branch. We could add a new change to the branch with some formatting applied, but that wouldn't help with earlier changes. We could go through and edit the changes one by one (this is actually comparatively easy with Jujutsu!) but it would still be a pain for longer branches. Instead, I ended up using `jj fix` to solve this problem.

`jj fix` ([documented here](https://jj-vcs.github.io/jj/latest/cli-reference/#jj-fix)) is a command that takes a set of changes to apply to, and then runs various configured tools against each of the files that has a diff in those changes.

For C# formatting we happen to use [the Jetbrains CLI](https://www.jetbrains.com/help/resharper/CleanupCode.html), but this can be configured to work with any formatting tool. `jj fix` happens to require a tool which accepts file contents on stdin, and writes the updated file contents to stdout<sup>1</sup>, so we need a wrapper script to make that work with the jetbrains cli:

```bash
#!/usr/bin/env bash

set -e # abort on error
set -x # print out commands to help debugging

RAND=$(tr -dc A-Za-z0-9 < /dev/random | head -c 10)
FILE="/tmp/file-to-format-$RAND.cs"

cat - > $FILE
# realpath is required since the file isn't part of the solution,
# so we need an absolute path to force jb to consider it
# https://youtrack.jetbrains.com/issue/RSRP-489150/
dotnet tool run jb -- cleanupcode  --no-build --include=$(realpath $FILE) 1>&2
cat $FILE
rm $FILE
```

This script creates a temporary file, formats it using the JetBrains CLI, and outputs the result. The `realpath` command ensures the file is recognized by the formatter, even though it's not part of the solution.

With that, we can run a command like the following:

```
jj fix -s k --config fix.tools.jb.command='["./scratch/cleanup-stdin.sh"]' --config fix.tools.jb.patterns='["glob:**/*.cs"]'
```

to automatically reformat files changed in `k` (and its descendants). `jj fix` is guaranteed to never introduce new conflicts, but it can fix conflicts in existing changes.

If we want to run this command more often, we can save the `fix.tools` settings to jj's toml config, and they'll automatically get picked up the next time we run `jj fix`. We can also use `fix.tools.X.enabled` to turn tools on or off as needed.

Because both branches now have consistent formatting, our merge conflict goes away and the fix can be integrated without issue. Jujutsu saves the day again! 🎉

If you're curious about trying out Jujutsu, I'd highly recommend [installing it and giving it a try](https://jj-vcs.github.io/jj/latest/install-and-setup/). It's compatible with existing git repos, so you don't have to worry about forcing other people to use it as well :)

#### Footnotes

1. In the future [the proposed `jj run` command](https://jj-vcs.github.io/jj/latest/design/run/) may be a better fit for `jb cleanupcode`, since it's designed to work with tools that expect a whole working copy to run against, rather than individual files
