---
title: Learning pixel art
original: https://blog.nyctef.com/post/172442757707/learning-pixel-art
date: 2018-03-18
---

So recently I was playing Celeste (which is just a wonderful game) and between that and a few other things I was inspired to try out learning how to do some basic pixel art. The great thing about pixel art is that it’s very accessible - you can create it in pretty much any image editor you can imagine. Doing animation can be a bit trickier, though, so I ended up shelling out ten quid for Aseprite, because there’s something just right about creating pixel art in a UI built out of pixel art:

![image](https://64.media.tumblr.com/c6e307e938a12e59834262217f0faa46/tumblr_inline_p6gamd9eO11s8ktyn_540.png)

Anyway, I started following [some basic tutorials](https://www.youtube.com/watch?v=y6Igao5Uvu8) and quickly ended up with something that actually worked:

![image](https://64.media.tumblr.com/bc14dc1fcff3feb77afd9676aac001e2/tumblr_inline_p6gaejWxFj1s8ktyn_540.gif)

After that I stated experimenting and gave my little robot something to hold:

![image](https://64.media.tumblr.com/47f93c8a4d9de767c53c0cc5a00fde98/tumblr_inline_p6gapzlb3Q1s8ktyn_540.gif)

and started trying out some other run cycles (not nearly as developed yet):

![image](https://64.media.tumblr.com/5b8242d4a57bea72cb22facfa9709d25/tumblr_inline_p6garlCgUm1s8ktyn_540.gif)

One pleasant surprise I found was that github displays gif diffs pretty nicely:

![image](https://64.media.tumblr.com/857eddef5615550b12fc645159bff72b/tumblr_inline_p6gayeQTY11s8ktyn_540.gif)

which really helped with seeing the changes/improvements I was making at each step.

Also, Aseprite includes a commandline tool, so I got to automate the creation of gifs+sprite sheets from the custom .aseprite files that the editor normally deals with with [a simple powershell script](https://github.com/nyctef/sprites/blob/0b744678b791e047455c430eecaaa954972855b7/build.ps1)

Anyway, I’m only a few hours in here, so I hope to get more time to spend on more tutorials and experiments
