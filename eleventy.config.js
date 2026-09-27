export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("posts/**/*.mp4");
  eleventyConfig.addPassthroughCopy("posts/**/*.png");
}
