import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "favicon.ico");

const SIZE = 32;
const SS = 4;
const N = SIZE * SS;

const RING_R = 45, RING_HALF = 4;
const DOT1 = [40, 50], DOT2 = [60, 50], DOT_R = 12;
const LINE = [30, 50, 70, 50], LINE_HALF = 1;
const ORANGE = [0xc2, 0x41, 0x0c];
const BLACK = [0x17, 0x17, 0x17];

const hyp = (x, y, px, py) => Math.hypot(x - px, y - py);

function distToSeg(x, y, x1, y1, x2, y2) {
  const cx = Math.min(Math.max(x, Math.min(x1, x2)), Math.max(x1, x2));
  const cy = Math.min(Math.max(y, Math.min(y1, y2)), Math.max(y1, y2));
  return Math.hypot(x - cx, y - cy);
}

function sample(x, y) {
  let r = 0, g = 0, b = 0, a = 0;
  const ring = Math.abs(hyp(x, y, 50, 50) - RING_R) <= RING_HALF;
  const dot1 = hyp(x, y, DOT1[0], DOT1[1]) <= DOT_R;
  const dot2 = hyp(x, y, DOT2[0], DOT2[1]) <= DOT_R;
  if (ring || dot1) { r = ORANGE[0] / 255; g = ORANGE[1] / 255; b = ORANGE[2] / 255; a = 1; }
  if (dot2) { r = BLACK[0] / 255; g = BLACK[1] / 255; b = BLACK[2] / 255; a = 1; }
  if (distToSeg(x, y, LINE[0], LINE[1], LINE[2], LINE[3]) <= LINE_HALF) {
    r = r * 0.5 + (ORANGE[0] / 255) * 0.5;
    g = g * 0.5 + (ORANGE[1] / 255) * 0.5;
    b = b * 0.5 + (ORANGE[2] / 255) * 0.5;
    a = a * 0.5 + 0.5;
  }
  return [r, g, b, a];
}

const px = Buffer.alloc(SIZE * SIZE * 4);
for (let iy = 0; iy < SIZE; iy++) {
  for (let ix = 0; ix < SIZE; ix++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const x = ((ix * SS + sx + 0.5) / N) * 100;
        const y = ((iy * SS + sy + 0.5) / N) * 100;
        const sr = sample(x, y);
        r += sr[0]; g += sr[1]; b += sr[2]; a += sr[3];
      }
    }
    const k = SS * SS;
    const idx = (iy * SIZE + ix) * 4;
    px[idx] = Math.round((r / k) * 255);
    px[idx + 1] = Math.round((g / k) * 255);
    px[idx + 2] = Math.round((b / k) * 255);
    px[idx + 3] = Math.round((a / k) * 255);
  }
}

const xor = Buffer.alloc(SIZE * SIZE * 4);
for (let iy = 0; iy < SIZE; iy++) {
  for (let ix = 0; ix < SIZE; ix++) {
    const src = (iy * SIZE + ix) * 4;
    const dst = ((SIZE - 1 - iy) * SIZE + ix) * 4;
    xor[dst] = px[src + 2];
    xor[dst + 1] = px[src + 1];
    xor[dst + 2] = px[src];
    xor[dst + 3] = px[src + 3];
  }
}

const andMask = Buffer.alloc(SIZE * 4);
const bih = Buffer.alloc(40);
bih.writeUInt32LE(40, 0);
bih.writeInt32LE(SIZE, 4);
bih.writeInt32LE(SIZE * 2, 8);
bih.writeUInt16LE(1, 12);
bih.writeUInt16LE(32, 14);
const img = Buffer.concat([bih, xor, andMask]);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry[0] = SIZE;
entry[1] = SIZE;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(img.length, 8);
entry.writeUInt32LE(22, 12);

const ico = Buffer.concat([header, entry, img]);
writeFileSync(OUT, ico);
console.log("Wrote valid " + SIZE + "x" + SIZE + " 32bpp ICO (" + ico.length + " bytes) -> " + OUT);
