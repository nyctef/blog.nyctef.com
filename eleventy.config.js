export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/style.css");
  // setting addTemplateFormats rather than addPassthroughCopy with a glob
  // since there seems to be a chokidar bug where two different globs for the same folder
  // (eg src/posts/**/*.mp4 and src/posts/**/*.md) cause the latter to not work, so
  // then we don't get hot reloading for md changes.
  eleventyConfig.addTemplateFormats(["mp4", "png", "jpg", "jpeg", "gif", "webp", "svg", "avif"]);

  eleventyConfig.setInputDirectory("src");
  eleventyConfig.setOutputDirectory("dist");
}
