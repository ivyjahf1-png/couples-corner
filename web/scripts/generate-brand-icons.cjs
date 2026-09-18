/**
 * Couples Corner — brand icon generator.
 *
 * Derives the official icon set from the in-code brand mark (see
 * web/components/ui/Logo.tsx): a pair of interlocking dots — brand orange
 * (#f97316) + white — on the dark navy canvas (#0F172A).
 *
 * Usage:  node scripts/generate-brand-icons.cjs
 *
 * Outputs (Next.js file conventions + PWA icons):
 *   web/app/icon.png                    512  (App Router <link rel="icon">)
 *   web/app/apple-icon.png              180  (iOS home-screen / touch icon)
 *   web/app/favicon.ico                 16/32/48 (browser tab)
 *   web/public/icons/icon-192.png       PWA
 *   web/public/icons/icon-512.png       PWA
 *   web/public/icons/icon-maskable-512.png  PWA maskable (Android adaptive)
 *   web-admin/app/icon.png              512  (admin favicon)
 *   web-admin/app/apple-icon.png        180  (admin iOS touch icon)
 *   web-admin/app/favicon.ico           16/32/48
 *
 * Idempotent: safe to rerun; overwrites only these generated files.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const WEB = path.resolve(__dirname, "..");
const ROOT = path.resolve(WEB, "..");
const ADMIN = path.join(ROOT, "web-admin");

/** Brand palette — mirrors app/globals.css tokens. */
const NAVY = "#0F172A";
const NAVY_HI = "#16233F";
const BRAND = "#f97316";
const WHITE = "#ffffff";

/** Master mark: rounded app tile (used for generic icons + favicons). */
function masterSvg({ rounded = true, dotScale = 1 } = {}) {
  const r = Math.round(75 * dotScale);
  const sep = Math.round(210 * dotScale);
  const cx1 = 256 - Math.round(sep / 2);
  const cx2 = 256 + Math.round(sep / 2);
  const radius = rounded ? 112 : 0;
  const inner = rounded ? 106 : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${NAVY_HI}"/>
      <stop offset="1" stop-color="${NAVY}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="48%" r="55%">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="196" fill="url(#glow)"/>
  <circle cx="${cx1}" cy="256" r="${r}" fill="${BRAND}"/>
  <circle cx="${cx2}" cy="256" r="${r}" fill="${WHITE}"/>
  ${
    rounded
      ? `<rect x="6" y="6" width="500" height="500" rx="${inner}" fill="none" stroke="${BRAND}" stroke-opacity="0.32" stroke-width="12"/>`
      : ""
  }
</svg>`;
}

/** Multi-size PNG-embedded ICO (Vista+; supported by every modern browser). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function renderPng(svg, size, file) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(file, png);
  return png;
}

async function writeIco(svg, sizes, file) {
  const images = [];
  for (const size of sizes) {
    const data = await renderPng(svg, size, path.join(path.dirname(file), `.ico-${size}.png`));
    images.push({ size, data });
    fs.unlinkSync(path.join(path.dirname(file), `.ico-${size}.png`));
  }
  fs.writeFileSync(file, buildIco(images));
}

async function main() {
  const tile = masterSvg({ rounded: true });
  const full = masterSvg({ rounded: false });
  const maskable = masterSvg({ rounded: false, dotScale: 0.8 });

  for (const dir of [path.join(WEB, "public", "icons"), path.join(WEB, "app"), path.join(ADMIN, "app")]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // --- Web (Next.js App Router conventions) ---
  await renderPng(tile, 512, path.join(WEB, "app", "icon.png"));
  await renderPng(full, 180, path.join(WEB, "app", "apple-icon.png"));
  await writeIco(tile, [16, 32, 48], path.join(WEB, "app", "favicon.ico"));

  // --- PWA / installable web app ---
  await renderPng(tile, 192, path.join(WEB, "public", "icons", "icon-192.png"));
  await renderPng(tile, 512, path.join(WEB, "public", "icons", "icon-512.png"));
  await renderPng(maskable, 512, path.join(WEB, "public", "icons", "icon-maskable-512.png"));

  // --- Admin panel ---
  await renderPng(tile, 512, path.join(ADMIN, "app", "icon.png"));
  await renderPng(full, 180, path.join(ADMIN, "app", "apple-icon.png"));
  await writeIco(tile, [16, 32, 48], path.join(ADMIN, "app", "favicon.ico"));

  console.log("Brand icons generated:");
  console.log("  web/app/{icon.png, apple-icon.png, favicon.ico}");
  console.log("  web/public/icons/{icon-192, icon-512, icon-maskable-512}.png");
  console.log("  web-admin/app/{icon.png, apple-icon.png, favicon.ico}");
}

main().catch((error) => {
  console.error("Icon generation failed:", error);
  process.exit(1);
});
