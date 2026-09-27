export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/style.css");
  eleventyConfig.addPassthroughCopy("src/posts/**/*.mp4");
  eleventyConfig.addPassthroughCopy("src/posts/**/*.png");

  eleventyConfig.setInputDirectory("src");
  eleventyConfig.setOutputDirectory("dist");
}
