"use client";

/**
 * THE POINTING BOT — the "you don't have enough coins" banner.
 *
 * WHY A BOT AND NOT A STRIP OF TEXT. The coin top-up sheet opens at the exact
 * moment a member's action has just been REFUSED. At that point the screen is
 * already showing a red error and a list of prices, and a fourth block of
 * plain text ("Insufficient coins") competes with both without adding
 * anything. A character that POINTS at the price list says the same thing in
 * a way the eye follows: the problem is not the button you pressed, it is the
 * wallet, and here is where the fix is.
 *
 * IT IS DECORATIVE, AND THAT IS A HARD RULE. The bot is drawn with inline SVG
 * and animated with CSS transforms only. It carries no information that is not
 * also in the adjacent text — the banner's real content is the headline and
 * the shortfall, both of which are real DOM text. The SVG is `aria-hidden`, so
 * a screen reader announces the sentence and never the drawing. A member who
 * has `prefers-reduced-motion` set still gets the same message with the
 * animation dropped (see the media query in `app/globals.css`).
 *
 * WHY THE MOTION IS TRANSFORM-ONLY. Every keyframe animates `transform` and
 * `opacity` exclusively. Animating `width`, `height` or `top` would force a
 * layout pass on every frame of a banner that sits directly above the price
 * list — the list would jitter as the banner breathes. Transforms are
 * composited, so the animation never touches layout at all.
 *
 * THE BOT IS POINTING DOWN. The arm and the finger sit below the body and
 * angle toward the price list that follows, so the gesture has a target. A bot
 * pointing sideways into empty space is decoration; a bot pointing at the
 * packs is a signpost.
 */


export function PointingBotBanner({
  title,
  detail,
}: {
  /** The headline. Real text, announced by screen readers. */
  title: string;
  /** Supporting sentence. Optional. */
  detail?: string | null;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative mb-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-orange-500/35 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent px-3 py-3 pr-4"
    >
      {/* THE BOT. Inline SVG rather than an image file: the arm has to animate
          in coordination with the body, and a raster or a single `<img>` cannot
          move one limb without moving all of them. The drawing is 64×72 in a
          56×64 box and is `aria-hidden` because the sentence beside it carries
          the whole meaning. */}
      <svg
        viewBox="0 0 64 72"
        width="56"
        height="64"
        aria-hidden="true"
        focusable="false"
        className="shrink-0 overflow-visible"
      >
        <defs>
          <linearGradient id="cc-bot-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFB05C" />
            <stop offset="100%" stopColor="#FF7A00" />
          </linearGradient>
          <linearGradient id="cc-bot-visor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2B1B4D" />
            <stop offset="100%" stopColor="#150D2B" />
          </linearGradient>
        </defs>

        {/* ANTENNA. The ball bobs with the body because it is a child of the
            same group — one transform, one composited layer. */}
        <g className="cc-bot-antenna">
          <line x1="32" y1="12" x2="32" y2="4" stroke="#FFB05C" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="3" r="3.5" fill="#FFD08A" />
        </g>

        {/* HEAD. A rounded square with a dark visor and two eyes. The eyes
            BLINK on their own keyframe — a static bot reads as a logo, a
            blinking one reads as something looking at you. */}
        <g className="cc-bot-head">
          <rect x="8" y="10" width="48" height="36" rx="13" fill="url(#cc-bot-body)" />
          <rect x="15" y="19" width="34" height="18" rx="9" fill="url(#cc-bot-visor)" />
          <g className="cc-bot-eyes">
            <circle cx="25" cy="28" r="4" fill="#7BE7FF" />
            <circle cx="39" cy="28" r="4" fill="#7BE7FF" />
            <circle cx="26.4" cy="26.8" r="1.4" fill="#FFFFFF" opacity="0.9" />
            <circle cx="40.4" cy="26.8" r="1.4" fill="#FFFFFF" opacity="0.9" />
          </g>
          {/* A small mouth: a flat line that becomes a smile when the bot
              "talks". The mouth is a SEPARATE element so it can carry its own
              keyframe without dragging the head with it. */}
          <path
            d="M26 40 Q32 45 38 40"
            stroke="#7A3B00"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className="cc-bot-mouth"
          />
          {/* Ears */}
          <rect x="3" y="22" width="5" height="12" rx="2.5" fill="#E06800" />
          <rect x="56" y="22" width="5" height="12" rx="2.5" fill="#E06800" />
        </g>

        {/* BODY. Narrower than the head, so the head reads as the "face". */}
        <g className="cc-bot-body-group">
          <rect x="18" y="46" width="28" height="16" rx="7" fill="#E06800" />
          <circle cx="32" cy="53" r="3.5" fill="#FFD08A" opacity="0.9" />
        </g>

        {/* THE POINTING ARM.
            Anchored at the body's right shoulder, angled down-right toward the
            price list that follows this banner in the DOM. The forearm is a
            thick rounded line; the finger is a shorter, brighter stroke that
            extends past the elbow, and the whole group swings on the
            `cc-bot-point` keyframe. */}
        <g className="cc-bot-arm">
          <line x1="44" y1="52" x2="58" y2="56" stroke="#FFB05C" strokeWidth="6" strokeLinecap="round" />
          <line x1="57" y1="56" x2="63" y2="63" stroke="#FFD08A" strokeWidth="5" strokeLinecap="round" />
          {/* The fingertip takes a small pulse of its own so the eye lands on
              the exact point being indicated. */}
          <circle cx="63" cy="63" r="3" fill="#FFE7B3" className="cc-bot-finger" />
        </g>
      </svg>

      {/* THE WORDS. This is the actual content of the banner. */}
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight text-orange-100">{title}</p>
        {detail ? (
          <p className="mt-0.5 text-xs leading-snug text-orange-200/80">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}
