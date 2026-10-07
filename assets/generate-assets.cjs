/* Deterministic rasterization of the official checked-in SAM AI letter paths.
 * Run: node assets/generate-assets.cjs [path-to-build-time-sharp-module]
 * No fonts, network access, or runtime app dependency are required.
 */
/* global __dirname */
const { Buffer } = require("node:buffer");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require(process.argv[2] || "sharp");

const directory = __dirname;
const blue = "#168BD1";

async function main() {
  const source = await fs.readFile(
    path.join(directory, "sam-logo.svg"),
    "utf8",
  );
  const inner = source
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  const white = inner
    .replaceAll("#168BD1", "#FFFFFF")
    .replaceAll("#141414", "#FFFFFF");
  // Preserve the actual letter paths; stack SAM and AI to fit a square app icon.
  const letters = `<svg x="182" y="300" width="660" height="230" viewBox="105 169 861 299">${white}</svg>
  <svg x="414" y="570" width="196" height="138" viewBox="985 169 425 299">${white.replaceAll("path-1-outside-1_11162_28933", "ai-mask")}</svg>`;
  const mark = (
    background,
    scale,
  ) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-labelledby="title description">
  <title id="title">SAM AI by Textmunication app icon</title>
  <desc id="description">The official SAM AI letter shapes, stacked in white on SAM blue for a square app icon.</desc>
  ${background ? `<rect width="1024" height="1024" fill="${blue}"/>` : ""}
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${letters}</g>
  </svg>`;
  const icon = mark(true, 1.1);
  await fs.writeFile(path.join(directory, "brand-mark.svg"), icon);
  await sharp(Buffer.from(source))
    .trim()
    .png()
    .toFile(path.join(directory, "sam-logo.png"));
  for (const [name, size, background, scale] of [
    ["icon.png", 1024, true, 1.1],
    ["android-icon-foreground.png", 1024, false, 0.72],
    ["android-icon-monochrome.png", 1024, false, 0.72],
    ["splash-icon.png", 1024, false, 1.0],
    ["favicon.png", 64, true, 1.1],
  ]) {
    await sharp(Buffer.from(mark(background, scale)))
      .resize(size, size)
      .png()
      .toFile(path.join(directory, name));
  }
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: blue },
  })
    .png()
    .toFile(path.join(directory, "android-icon-background.png"));
  console.log(
    "Generated the SAM wordmark and app assets from the official vector.",
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
