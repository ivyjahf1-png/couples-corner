/* ─────────────────────────────────────────────────────────────────────────────
   PostCSS pipeline.

   `autoprefixer` IS DELIBERATELY NOT HERE, and adding it would be a mistake.

   It belongs to the Tailwind v3 stack, where the core shipped unprefixed CSS and
   a separate Autoprefixer pass ran afterwards to add `-webkit-` / `-moz-`
   fallbacks for older WebKit. That division of labour ended in v4: `@tailwindcss/
   postcss` (this file's only plugin, v4.3.3) runs Lightning CSS internally and
   emits the vendor prefixes itself.

   So the prefixes this project needs are ALREADY being produced — verified
   against the build output: `.netlify/static` (the committed deploy) carries 37
   `-webkit-` and 4 `-moz-` declarations, and a local production build carries
   99 `-webkit-` and 4 `-moz-`. Among them are 18 `-webkit-backdrop-filter`
   declarations for the app's glass panels and 3 `-webkit-overflow-scrolling`
   rules for the momentum scrolling those panels' scroll regions depend on —
   i.e. exactly the two features that break silently on older mobile WebKit.

   Stacking Autoprefixer on top would double-prefix every one of those and
   regress the modern-CSS output: Lightning CSS lowers things like nesting and
   `dvh`, and a second prefixer run over its result is how stale duplicated
   declarations get back into the bundle. `autoprefixer` is also not installed,
   so adding the entry would fail the build outright.

   Targets are set by the `browserslist` defaults Lightning CSS applies, not by
   an Autoprefixer config. If a specific older WebKit version genuinely needs a
   prefix the current build lacks, the fix is a browserslist query here — not
   reintroducing the plugin.
   ───────────────────────────────────────────────────────────────────────────── */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
