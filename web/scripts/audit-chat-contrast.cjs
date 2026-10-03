// Measures WCAG contrast for the chat theme tokens in globals.css.
//
// Every theme declares the same custom properties, so a value that passes on
// Daylight can still fail on Dusk — and it will, because a near-white text on a
// near-white bubble is invisible. Checking one theme is how these bugs ship;
// this walks all of them and both bubble directions.
//
// Bubble fills are often translucent (e.g. `rgb(255 255 255 / 0.07)`), so each
// is composited over its own canvas first. Contrast against a translucent fill is
// undefined until you resolve it, which is precisely how a value can look
// reasonable in code and be unreadable on screen.
const fs = require("fs");

const css = fs.readFileSync("app/globals.css", "utf8");
const THEMES = [
  "chat-theme-default", "chat-theme-charcoal", "chat-theme-dusk", "chat-theme-ocean",
  "chat-theme-ember", "chat-theme-rose",
];

// ── colour helpers ───────────────────────────────────────────────────────────
function parse(color) {
  const c = color.trim();
  const m = c.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }
  const hex = c.replace("#", "");
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1,
    };
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: 1,
  };
}

/** Composite `fg` at alpha `a` over opaque `bg`. */
function over(fg, bg) {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ── collect tokens per theme ────────────────────────────────────────────────
const strip = (l) =>
  l.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/, "")
   .replace(/'(?:\\.|[^'\\])*'/g, "").replace(/"(?:\\.|[^"\\])*"/g, "");

const lines = css.split(/\r?\n/);
const blocks = {};
let cur = null, d = 0;

for (const raw of lines) {
  const line = strip(raw);
  const isList = THEMES.some((t) => new RegExp("\\." + t + "\\s*,").test(line));
  const name = isList ? null : THEMES.find((t) => new RegExp("\\." + t + "\\s*\\{").test(line));
  if (name && cur === null && !blocks[name]) { cur = name; blocks[name] = {}; d = 0; }
  if (cur) {
    d += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    for (const m of line.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      blocks[cur][m[1]] = m[2].trim();
    }
    if (d === 0) cur = null;
  }
}

// ── measure ─────────────────────────────────────────────────────────────────
let failures = 0;
console.log(
  "theme          surface    IN text   IN ratio  OUT text  OUT ratio  muted vs surface",
);
console.log("-".repeat(92));

for (const t of THEMES) {
  const b = blocks[t];
  if (!b) { console.log(`${t}: MISSING`); failures++; continue; }

  const canvas = parse(b["--chat-canvas"]);
  const surface = over(parse(b["--chat-surface"]), canvas);

  // Incoming bubble: translucent fill composited on the canvas, which is what
  // sits behind it in the thread.
  const inBg = over(parse(b["--chat-in-bg"]), canvas);
  const inText = parse(b["--chat-in-text"]);
  const inR = ratio(inText, inBg);

  // Outgoing bubble: opaque orange gradient; the darker stop (#chat-out-to) is
  // the worst case for white text, so that is what is measured.
  const outText = parse(b["--chat-out-text"]);
  const outBg = parse(b["--chat-out-to"]);
  const outR = ratio(outText, outBg);

  // Muted meta text (timestamps, status) against the header/composer surface.
  const mutedR = ratio(parse(b["--chat-muted"]), surface);

  // WCAG AA: 4.5 for body text, 3.0 for large text (>=18.66px bold / 24px).
  const cells = [
    [inR, 4.5, "in"],
    [outR, 4.5, "out"],
    [mutedR, 4.5, "muted"],
  ];
  for (const [r, min, label] of cells) {
    if (r < min) { failures++; console.log(`  ^^ ${t} ${label} FAILS AA: ${r.toFixed(2)} < ${min}`); }
  }

  console.log(
    `${t.padEnd(14)} ${b["--chat-canvas"].padEnd(10)} ` +
    `${b["--chat-in-text"].padEnd(9)} ${inR.toFixed(2).padStart(5)}    ` +
    `${b["--chat-out-text"].padEnd(9)} ${outR.toFixed(2).padStart(5)}   ` +
    `${mutedR.toFixed(2).padStart(5)}`,
  );
}

console.log(failures ? `\n${failures} CONTRAST FAILURE(S)` : "\nAll themes pass WCAG AA for body text.");
process.exit(failures ? 1 : 0);
