/**
 * One-off migration: replace every dead external embedUrl in lib/gamesData.ts
 * with a working built-in engine.
 *
 * The 27 `kind: "iframe"` entries pointed at placeholder GameDistribution
 * paths that are not real builds — requesting them returned an upstream
 * Nginx / 404 page instead of a game. Each is remapped to the built-in
 * engine that best matches its genre, and the phantom embedUrl is removed.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "./lib/gamesData.ts";

/** id -> built-in engine that replaces its dead external build. */
const REMAP = {
  // Slots — share the reel engine.
  "fortune-gems": "builtin-slots",
  "wealthy-tiger": "builtin-slots",
  "lucky-lantern-spins": "builtin-slots",
  "ocean-pearl-reels": "builtin-slots",
  // Puzzle / grid movers.
  "world-goal": "builtin-slide",
  "rocket-star": "builtin-slide",
  "neon-runner-rush": "builtin-slide",
  "brick-breaker-duo": "builtin-slide",
  "space-shooter-sparks": "builtin-slide",
  "dino-dash-date": "builtin-slide",
  "pinball-partners": "builtin-slide",
  "empire-builders": "builtin-slide",
  "nitro-street-drift": "builtin-slide",
  "ninja-shadow-leap": "builtin-slide",
  // Duels — share the turn-based board engine.
  "couples-chess-duel": "builtin-tictactoe",
  "checkers-charm": "builtin-tictactoe",
  "tower-defense-tango": "builtin-tictactoe",
  "archer-ace-showdown": "builtin-tictactoe",
  "zombie-block-defense": "builtin-tictactoe",
  // Pairing / card games.
  "backgammon-bliss": "builtin-memory",
  "snakes-and-ladders-love": "builtin-memory",
  "domino-duet": "builtin-memory",
  "bubble-pop-bliss": "builtin-memory",
  "fruit-slice-frenzy": "builtin-memory",
  "settlers-of-couples-bay": "builtin-memory",
  "solitaire-sunsets": "builtin-memory",
  "idle-garden-together": "builtin-memory",
};

let source = readFileSync(FILE, "utf8");
const applied = [];

for (const [id, kind] of Object.entries(REMAP)) {
  const anchor = `id: "${id}",`;
  const start = source.indexOf(anchor);
  if (start === -1) {
    throw new Error(`Entry not found for id "${id}" — refusing to write a partial migration.`);
  }
  // Entry block ends at the first "\n  },\n" after the id.
  // Entry block ends at the first closing brace of the entry object.
  const endMatch = /\r?\n  \},/.exec(source.slice(start));
  if (!endMatch) throw new Error(`Could not find the end of the entry "${id}".`);
  const end = start + endMatch.index;

  let block = source.slice(start, end);

  if (!block.includes('kind: "iframe"')) {
    throw new Error(`Entry "${id}" is not an iframe entry — aborting to avoid corrupting data.`);
  }
  block = block.replace('kind: "iframe"', `kind: "${kind}"`);

  // Drop the now-meaningless embedUrl line (plus its trailing newline).
  const before = block;
  block = block.replace(/\r?\n\s*embedUrl: "[^"]*",/, "");
  if (block === before) throw new Error(`No embedUrl removed for "${id}" — aborting.`);

  source = source.slice(0, start) + block + source.slice(end);
  applied.push(`${id} -> ${kind}`);
}

// Safety net: no phantom external build may survive.
const leftovers = source.match(/embedUrl: "[^"]+"/g) ?? [];
if (leftovers.length > 0) {
  throw new Error(`Still ${leftovers.length} embedUrl value(s) present: ${leftovers.join(", ")}`);
}

writeFileSync(FILE, source);
console.log(`Remapped ${applied.length} entries:`);
for (const line of applied) console.log(`  ${line}`);
console.log("\nRemaining embedUrl declarations (should be 0):", leftovers.length);
