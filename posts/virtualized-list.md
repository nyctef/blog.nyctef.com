---
title: Building a virtualized list from scratch
original: https://medium.com/ingeniouslysimple/building-a-virtualized-list-from-scratch-9225e8bec120?source=friends_link&sk=e32ae25d85144305872ae088d19379a1
date: 2020-01-16
---

React is pretty fast in general, but it can have trouble when repeatedly rendering thousands of elements. This is true even if only a few of the elements are visible at once! UI “virtualization” is a technique for emulating a list with many elements while only rendering as few as possible to make the screen look correct.

Of course, there are plenty of virtualization libraries already available. The most popular is [`react-virtualized`](https://www.npmjs.com/package/react-virtualized), which implements just about any layout you could think of and has a ton of customization available. Sometimes you only need something super basic, though, or you have some custom requirements that don’t quite fit with how the library works.

We ran into the latter case last week: we needed to try and add virtualization to a UI component from another framework, and it turned out to be a lot simpler than I assumed!

In this article I’ll show how to build a simple scrollable virtualized list in React, but the basic technique should be applicable to any UI framework.

![](https://cdn-images-1.medium.com/max/800/1*qD-MI5lWidzhFYTbwgWclA.png)

We’re rendering thousands of elements, but we only need four elements (2048–2051) for this UI to look correct!

I’ve set up some examples at [nyctef.github.io/virtualized-list-examples](https://nyctef.github.io/virtualized-list-examples) where you can play around with different versions and see the source code for each implementation. The 1,000 element case renders reasonably well on my work machine — if you want to see some slowdown, you may want to change the number of elements to 10,000 or enable CPU throttling in Chrome:

![](https://cdn-images-1.medium.com/max/800/1*mboBbIMhaYqKF_99nhNFHA.png)

Enabling CPU throttling in Chrome devtools is great for demonstrating potential performance problems while not eating all your machine’s resources.

---

The way that most virtualized list components work is that instead of passing a list of elements to render, we instead provide the list with just the number of elements we want to render, how big each element is, and a callback which renders a single item.

The first thing we need to change is how the elements in the list are laid out. Normally we’d create a lot of divs next to each other and let the layout engine stack them up, but now we’re going to be skipping most of the elements. Instead, we’ll position each element absolutely, and force the inner container to be the right height so the scrollbar will still render correctly.

We could wrap each item in a new div to give it the right `position` and `top` values. However, most virtualization libraries pass some styles into the item render method, which consumers then need to apply to their own elements. This is slightly more efficient at the cost of being more complicated, so you can decide whether you want to implement this yourself or not.

Now we have a list of items we need to display. We have the index of each item, and we know how tall the items are. We need to calculate the indexes of the items which should be visible. For that, we’ll need three bits of information:

![Diagram showing how the inner height, window height and scrollTop relate to each other.](https://cdn-images-1.medium.com/max/800/1*SQzqlpFuP0zPxpvpYXYWRg.png)

The **“inner” height** is the total height of the list itself. In our simple case, it’s the item height multiplied by the number of items.  
The **“window” height** is the height of the scrollable area: a window into the full list. This height will depend on the surrounding elements. For now it’s easiest to hardcode it to a specific value; we can look into ways of calculating it later.  
**scrollTop** measures how far the inner container is scrolled. It’s the distance between the top of the inner container and its visible part.

To find the elements which intersect the top and bottom edges of our scrollable area, we divide their pixel position by the height of the elements. We then use `Math.floor()` to turn the pixel position into a valid element index, and render all the elements between those two indexes:

```
{% raw %}
const VirtualizedList = props => {
  const { numItems, itemHeight, renderItem, windowHeight } = props;
  const [scrollTop, setScrollTop] = useState(0);

  const innerHeight = numItems * itemHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    numItems - 1, // don't render past the end of the list
    Math.floor((scrollTop + windowHeight) / itemHeight)
  );

  const items = [];
  for (let i = startIndex; i <= endIndex; i++) {
    items.push(
      renderItem({
        index: i,
        style: {
          position: "absolute",
          top: `${i * itemHeight}px`,
          width: "100%"
        }
      })
    );
  }

  const onScroll = e => setScrollTop(e.currentTarget.scrollTop);

  return (
    <div className="scroll" style={{ overflowY: "scroll" }} onScroll={onScroll}>
      <div
        className="inner"
        style={{ position: "relative", height: `${innerHeight}px` }}
      >
        {items}
      </div>
    </div>
  );
};
{% endraw %}
```

A minimal virtualized list.

This is a very basic example: there are many potential improvements you might want to make depending on your requirements. Here are a selection:

- Currently we’re making the assumption that **all items in the list are the same size**, and passing in a constant `itemHeight` value. Instead we could make `itemHeight` accept a callback which queries the item height for each index. This makes calculating the visible items a lot more complicated, though — I guess you’d need to build up an index of `pixel offset -> itemindex` (probably a binary search tree?). Some libraries offer a second callback which invalidates the saved item heights, so items can change size over time.
- If you turn on CPU throttling and look at the virtualized example, you may notice **it’s possible to scroll to elements before they’re rendered**, momentarily leaving ugly-looking white space. Many libraries implement “overscan” to solve this problem, which renders additional elements above and below the visible elements, so they’ll already be visible when they scroll into view.   
   This can also be useful if items have some kind of lazy-loading — we can start loading for elements just outside the viewable area so that they’ll be ready to display when the user scrolls down.
- We’re also assuming that **the scrollable area has a fixed size**. We still need to know what this size is, but we can get this information automatically using [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver). Bundling `ResizeObserver` into a [HOC](https://github.com/deepsweet/hocs/tree/9c953fe/packages/with-resize-observer-props) or [hook](https://github.com/ZeeCoder/use-resize-observer) is probably a good idea in React; alternatively you can implement this behavior directly in your virtualized list.

Of course there’s many more tweaks you can make. If you find yourself implementing a lot of these features, you may want to look into using a library yourself (or creating your own!). But being able to build a custom implementation yourself that does exactly what you need is very powerful.  
Have fun! :)

References I found useful:

- [https://dev.to/nishanbajracharya/what-i-learned-from-building-my-own-virtualized-list-library-for-react-45ik](https://dev.to/nishanbajracharya/what-i-learned-from-building-my-own-virtualized-list-library-for-react-45ik)
- [https://jsfiddle.net/1wtnfcgq/6/](https://jsfiddle.net/1wtnfcgq/6/) Not sure who wrote this, but thanks!
