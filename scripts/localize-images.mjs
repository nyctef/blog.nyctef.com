// For each top-level post in src/posts that links to remote images, convert it
// into a directory post (<name>/index.md), download the images alongside it,
// and rewrite the links to relative paths.
//
// Usage: node scripts/localize-images.mjs [--dry-run]

import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const postsDir = path.resolve(import.meta.dirname, "..", "src", "posts");
const dryRun = process.argv.includes("--dry-run");

const markdownImage = /!\[[^\]]*\]\(\s*<?(https?:\/\/[^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const htmlImage = /<img\b[^>]*?\bsrc=["'](https?:\/\/[^"']+)["']/gi;

const extensionsByType = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

function findImageUrls(text) {
  const urls = new Set();
  for (const regex of [markdownImage, htmlImage]) {
    for (const match of text.matchAll(regex)) {
      urls.add(match[1]);
    }
  }
  return [...urls];
}

function baseFileName(url) {
  const last = decodeURIComponent(new URL(url).pathname.split("/").pop() || "image");
  return last.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} fetching ${url}`);
  }
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
  return { data: Buffer.from(await response.arrayBuffer()), contentType };
}

function uniqueName(name, taken) {
  const { name: stem, ext } = path.parse(name);
  let candidate = name;
  for (let i = 2; taken.has(candidate); i++) {
    candidate = `${stem}-${i}${ext}`;
  }
  taken.add(candidate);
  return candidate;
}

async function processPost(fileName) {
  const postPath = path.join(postsDir, fileName);
  const text = await readFile(postPath, "utf8");
  const urls = findImageUrls(text);
  if (urls.length === 0) return;

  const slug = path.parse(fileName).name;
  const targetDir = path.join(postsDir, slug);
  console.log(`${fileName}: ${urls.length} image(s) -> ${slug}/index.md`);
  if (dryRun) {
    for (const url of urls) console.log(`  ${url} -> ${baseFileName(url)}`);
    return;
  }

  // Download everything before touching the post so a failure leaves it as-is.
  const taken = new Set(["index.md"]);
  const downloads = [];
  for (const url of urls) {
    const { data, contentType } = await download(url);
    let name = baseFileName(url);
    if (!path.extname(name) && extensionsByType[contentType]) {
      name += extensionsByType[contentType];
    }
    name = uniqueName(name, taken);
    downloads.push({ url, name, data });
    console.log(`  ${url} -> ${name}`);
  }

  await mkdir(targetDir, { recursive: true });
  for (const { name, data } of downloads) {
    await writeFile(path.join(targetDir, name), data);
  }

  const indexPath = path.join(targetDir, "index.md");
  execFileSync("git", ["mv", postPath, indexPath], { cwd: postsDir });

  let updated = text;
  for (const { url, name } of downloads) {
    updated = updated.replaceAll(url, `./${name}`);
  }
  await writeFile(indexPath, updated, "utf8");
}

const entries = await readdir(postsDir, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isFile() && entry.name.endsWith(".md")) {
    await processPost(entry.name);
  }
}
