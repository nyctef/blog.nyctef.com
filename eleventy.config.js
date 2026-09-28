export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/style.css");
  eleventyConfig.addPassthroughCopy("src/posts/**/*.mp4");
  eleventyConfig.addPassthroughCopy("src/posts/**/*.{png,jpg,jpeg,gif,webp,svg,avif}");

  eleventyConfig.setInputDirectory("src");
  eleventyConfig.setOutputDirectory("dist");
}
