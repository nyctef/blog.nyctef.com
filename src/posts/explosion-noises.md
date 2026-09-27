---
title: "[Explosion noises]"
original: https://blog.nyctef.com/post/172731266087/explosion-noises
date: 2018-04-08
---

Progress: adding player sprite and starting to cut holes in the collision mesh

<video src="https://i.imgur.com/vmmFBtg.mp4" controls></video>

Unity’s various animation systems all seem to be a bit complex for what I want to do now, so adapted some simple animation code from [this gamasutra article](https://www.gamasutra.com/blogs/JoeStrout/20150807/250646/2D_Animation_Methods_in_Unity.php) to get quick animations working.

Performance is a bit of a problem: ended up splitting the map mesh into 200x200 chunks so that an explosion didn’t have to recreate the entire thing. Performance still isn’t great - will probably have to investigate that some more later.

Here’s a later version, with some explosion animations:

<video src="https://i.imgur.com/iZdG4px.mp4" controls></video>
