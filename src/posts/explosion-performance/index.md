---
title: Improving explosion performance
original: https://blog.nyctef.com/post/173068665027/improving-explosion-performance
date: 2018-04-18
---

<p><p>As you can probably tell from the last post, explosion performance wasn’t great- we get a noticeable hitch every time it happens.The main reason for this is we’re basically tearing down all of the generated meshes, updating the underlying map data and then recreating the level geometry from scratch. There’s obviously some improvements that can be done here.</p><p>The level geometry is currently split up into two parts: the display mesh, which just holds a forward-facing texture to show the level to the player, and the collision mesh, which faces at right-angles to the player and gives unity’s physics system something to work with. The simplest thing to look at first was to edit the display texture rather than recreating it:</p>

<textarea rows="20" cols="100" readonly style="font-family:monospace">
    private void RemoveCircleFromMapTexture(Texture2D mapTexture, Vector3 localSpace, int explosionRadius)
    {
        Profiler.BeginSample("RemoveCircleFromMapTexture");
        var pixels = mapTexture.GetPixels32();
        for (int ex = -explosionRadius; ex &lt; +explosionRadius; ex++)
        for (int ey = -explosionRadius; ey &lt; +explosionRadius; ey++)
        {
            var x = (int) localSpace.x + ex;
            var y = (int) localSpace.y + ey;
            if (x &lt; 0 || x &gt;= Width || y &lt; 0 || y &gt;= Height)
            {
                continue;
            }
            if (ex * ex + ey * ey &gt; explosionRadius * explosionRadius)
            {
                continue;
            }

            pixels[y * Width + x] = new Color32(0, 0, 0, 0);
        }
        mapTexture.SetPixels32(pixels);
        mapTexture.Apply();
        Profiler.EndSample();
    }

</textarea><p>Using GetPixels32/SetPixels32 feels like it should be fast and efficient (we generally like working on large blocks of data) but it actually turns out that allocating the large array is slow and calling SetPixel lots of times is much faster:</p>

<textarea rows="1" cols="100" readonly style="font-family:monospace">
            mapTexture.SetPixel(x, y, new Color(0,0,0,0));
        ...
        mapTexture.Apply();
</textarea>

<p>The next big area to work on is the collision mesh update. I tried a bunch of microoptimisations to improve the performance of the marching squares algorithm + the triangle/mesh creation process, but nothing ended up being significant. In the end the main benefit came from splitting the collision mesh into square chunks and then only updating mesh chunks which had been touched by the explosion circle.</p>

<p>I played around a bit with the format of the map data itself, going from byte arrays to C# BitArrays and eventually ending up on length 64 arrays of 64-bit long integers to describe a 64x64 map chunk. The big advantage of having each row represented by a single number is that if two consecutive rows are both 0 (or both 0xffffffff) then no edge geometry is going to be generated for those rows since they're either completely solid or completely space, and can be skipped:</p>

<textarea rows="15" cols="100" readonly style="font-family:monospace">
        for (int mapY = 0; mapY &lt; MapChunk.ChunkSize - 1; mapY++)
        {
            var yc = chunk.Chunk[mapY];
            var y1c = chunk.Chunk[mapY + 1];

            if ((yc == 0 &amp;&amp; y1c == 0) || (yc == UInt64.MaxValue &amp;&amp; y1c == UInt64.MaxValue))
            {
                continue;
            }

            for (int mapX = 0; mapX &lt; MapChunk.ChunkSize - 1; mapX++)
            {
                // ... carry on with standard marching squares

</textarea>

<p>After going through all these optimisations there's still a noticable bump in the frame duration for frames which have an explosion, but it's no longer anywhere near as large as it used to be (it's basically only visible in the profiler) so I'm pretty happy with it at the moment:</p>

<video src="./explosion-perf-archived.mp4" controls></video>

<i>2026 edit: shout out to the Internet Archive for keeping a copy of the above video, which was originally stored on gfycat and then lost</i>
