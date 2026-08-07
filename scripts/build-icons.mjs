/**
 * Renders every app icon from one SVG source, so the web manifest, the iOS home-screen
 * icon and the App Store icon can never drift apart.
 *
 *   node scripts/build-icons.mjs
 *
 * The glyph is MUI's Restaurant icon — the same mark the site header shows — so the
 * installed app and the page it came from read as one product.
 *
 * Two shapes are produced:
 *  - "any"      : the mark inset on its own background, for browsers that draw it as-is.
 *  - "maskable" : the same mark at ~60% of the canvas, so Android's circle/squircle
 *                 mask can crop 20% off every edge without eating into it.
 * iOS square icons must be fully opaque with no alpha, or App Store Connect rejects
 * the build — hence `flatten` on every output.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BG = "#e9e6dd"; // the app's creamy page background
const FG = "#1c4f8f"; // deep blue, ~7:1 on the cream — legible at 16px in a tab strip

/** MUI Restaurant, viewBox 0 0 24 24. */
const GLYPH =
  "M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z";

/**
 * @param size    canvas edge in px
 * @param cover   fraction of the canvas the glyph should span (1 = edge to edge)
 * @param rounded corner radius in px, 0 for a hard square (iOS masks its own corners)
 */
function svg(size, cover, rounded) {
  const glyph = size * cover;
  const offset = (size - glyph) / 2;
  const scale = glyph / 24;
  const corners =
    rounded > 0
      ? `<rect width="${size}" height="${size}" rx="${rounded}" ry="${rounded}" fill="${BG}"/>`
      : `<rect width="${size}" height="${size}" fill="${BG}"/>`;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      corners +
      `<g transform="translate(${offset} ${offset}) scale(${scale})">` +
      `<path d="${GLYPH}" fill="${FG}"/>` +
      `</g></svg>`,
  );
}

const outputs = [
  // web manifest
  { file: "public/icons/icon-192.png", size: 192, cover: 0.62, rounded: 40 },
  { file: "public/icons/icon-512.png", size: 512, cover: 0.62, rounded: 108 },
  // Android masks up to 20% off each edge, so the glyph stays inside the safe circle
  { file: "public/icons/icon-maskable-512.png", size: 512, cover: 0.44, rounded: 0 },
  // iOS home screen — iOS rounds the corners itself, so ship it square
  { file: "public/icons/apple-touch-icon.png", size: 180, cover: 0.6, rounded: 0 },
  // App Store listing icon: 1024×1024, square, no alpha, no transparency
  { file: "public/icons/appstore-1024.png", size: 1024, cover: 0.6, rounded: 0 },
  // browser tab
  { file: "public/icons/favicon-32.png", size: 32, cover: 0.72, rounded: 0 },
];

for (const { file, size, cover, rounded } of outputs) {
  const abs = path.join(root, file);
  await mkdir(path.dirname(abs), { recursive: true });
  const png = await sharp(svg(size, cover, rounded))
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(abs, png);
  console.log(`${file}  ${size}×${size}`);
}

// keep the source shape in the repo so the icon can be re-cut at any size later
await writeFile(path.join(root, "public/icons/icon.svg"), svg(512, 0.62, 108));
console.log("public/icons/icon.svg");
