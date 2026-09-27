---
title: Building an Electron app from scratch (Part 3)
original: https://medium.com/ingeniouslysimple/building-an-electron-app-from-scratch-part-3-ab1fc9751339?source=friends_link&sk=88f8e664aea82e370179de6c2cada997
date: 2019-08-07
---

In the previous part we started building the actual interactive part of the application with React. However, it didn’t look particularly impressive:

![](https://cdn-images-1.medium.com/max/800/0*FJiWp62yUzp5LMlU.png)

If we want to build a full application, we need a set of layout conventions and UI widgets to build with. While HTML5 itself gives us plenty of tools, a toolkit like [Semantic UI](https://semantic-ui.com/) can significantly accelerate the process of putting together a good-looking and usable UI.

For this example we’ll be pulling the web implementation of Redgate’s design toolkit, called [Honeycomb](http://honeycomb.red-gate.com/). The [honeycomb web toolkit](https://github.com/red-gate/honeycomb-web-toolkit) is implemented as a set of SASS files, where [SASS](https://sass-lang.com/) is a styling language very similar to CSS but with some more advanced features. We’ll use npm to pull the sass files from the repo, and then use webpack to turn those SASS files into plain CSS that can be read by the electron browser.

We’ll need to install a whole bunch of npm modules to make this work:

- **sass-loader** uses **node-sass** to turn SASS files into CSS.
- **css-loader** will take a plain CSS file, and interpret `import`/`url()` paths and resolve them to webpack modules.
- **postcss-loader** uses PostCSS to apply postprocessing operations to the CSS. In this case, we’ll use it to run **autoprefixer**, which applies appropriate [vendor-specific prefixes](https://developer.mozilla.org/en-US/docs/Glossary/Vendor_Prefix#CSS_prefixes).
- **style-loader** takes the processed CSS and actually inserts it into the webpage.
- **url-loader** takes other files like images or fonts and inlines them as base64 URLs.

```
> npm install --save-dev sass-loader node-sass css-loader postcss-loader autoprefixer style-loader url-loader
```

Finally we need to actually grab the web toolkit itself:

```
> npm install --save git+[https://github.com/red-gate/honeycomb-web-toolkit.git](https://github.com/red-gate/honeycomb-web-toolkit.git)
```

Notably, here we’re installing a node module [directly from a github repository](https://docs.npmjs.com/files/package.json#git-urls-as-dependencies) instead of pulling a built package from npmjs.com. The package will be pulled from latest master, but the `package-lock.json` file will contain the specific commit hash that we installed, so we can make it consistent between different builds. We can also specify a particular git branch or tag to pull if we want a specific release of the toolkit.

We’ll need to configure all the above modules in webpack. We need one rule which tells webpack how to handle `.scss` files:

```
// [...]
rules: [
  {
    test: /\.scss$/,
    loaders: [
      "style-loader",
      "css-loader",
      "postcss-loader",
      "sass-loader"
    ]
  },
```

This is similar to our `.ts` rule from earlier, but we define a chain of loaders instead of just one. We also need to handle a bunch of extra file types (like images, fonts, etc) which come along with the SASS content. We’ll just throw those into url-loader.

We just have one last piece of configuration to go: we need to tell `postcss-loader` to run `autoprefixer` as part of its build step. We write out a separate `postcss.config.js` file next to the webpack config:

```
module.exports = {
  plugins: [
    require('autoprefixer')({
      browsers: ['last 2 versions', 'ie >= 8']
    })
  ]
};
```

Now we have our build set up, but we’re still not getting any styles in our build result. The last thing we need to do is to actually reference some styles from our entry point, so that webpack knows it needs to include them in the result.

There’s just one thing to fix: `honeycomb.scss` references various images/fonts/icons/etc with paths that are relative to the sass files inside the npm module. Unfortunately those paths won’t work when we try to reference the styles from outside. Ideally we’d be able to fix this by configuring sass/webpack to resolve the paths relative to the correct directory, but I haven’t been able to figure out how to do this correctly. Fortunately, honeycomb provides some sass variables so that we can provide the correct paths:

```
$hc-dir: '../../../node_modules/honeycomb-web-toolkit/src/';

$hc-icon-font-dir: $hc-dir + 'icons/vendor/redgate/';
$hc-navigation-images-dir: $hc-dir + 'navigation/images/';
$hc-font-dir: $hc-dir + 'type/vendor/';
$hc-checkbox-loading-icon-dir: $hc-dir + 'base/images';
$slick-loader-path: $hc-dir + 'carousel/vendor/slick/images/';
$fancyboxImagesDir: $hc-dir + 'lightbox/vendor/images/fancybox';
$hc-sharing-images-dir: $hc-dir + 'sharing/images';

@import 'node_modules/honeycomb-web-toolkit/src/honeycomb.scss';
```

SASS variables are useful for other things too: For example, we might want to scale down the font size that honeycomb uses. By default, honeycomb is designed for web pages (where spacing and readability are more important) but we want to create a desktop application (where information density and consistency with other applications are generally more important).

---

Once we have the styles available, we can wrap them in some fairly trivial React components:

```
{% raw %}
const Button: React.FunctionComponent<{
  onClick: () => void;
  primary?: boolean;
}> = props => (
  <a
    className={`button ${props.primary && "button--primary"}`}
    href="#"
    onClick={props.onClick}
  >
    {props.children}
  </a>
);

const GrayBox: React.FunctionComponent = props => (
  <div className="background-color--grey--1 spaced--tight padded--tight">
    {props.children}
  </div>
);

const Centered: React.FunctionComponent = props => (
  <div
    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
  >
    <div>{props.children}</div>
  </div>
);
{% endraw %}
```

Which then nicely compose together in our UI:

```
{% raw %}
const App = () => (
  <Centered>
    <GrayBox>
      <p style={{ width: "600px" }}>
        Hello, <Emphasis>world</Emphasis>
      </p>
      <Button primary onClick={() => alert("Ok!")}>
        OK
      </Button>
    </GrayBox>
  </Centered>
);
{% endraw %}
```

Creating something that definitely looks better than what we started with:

![](https://cdn-images-1.medium.com/max/800/1*UcUtMjWC2TDNMeeusGBDDg.png)

---

In the next part I was planning to go into more detail on building complex, maintainable applications with React and Redux, but there are already plenty of resources available on the web in that area so I’ll skip it for now.

Instead, we’ll look at pulling in external code to implement core bits of application logic. While we could write pretty much our entire application in typescript with the Node APIs, it’s not a familiar environment for many devs and we have a lot of preexisting code we want to use.

Stay tuned for more on that in the next part!

![](https://cdn-images-1.medium.com/max/2560/1*VvuuvNCk3H5-jLBpV8BueQ.png)

Photo by [Fractal Hassan](https://unsplash.com/photos/XoNj0ulsn1Y)
