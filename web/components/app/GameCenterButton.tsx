"use client";

import { useEffect, useRef, useState } from "react";
import { openGame } from "@/components/game/GameModal";

/**
 * Compact Game Center badge, for use INSIDE a card's header area.
 *
 * WHY THIS EXISTS ALONGSIDE `GameCenterButton`. The floating button is pinned
 * to the viewport's bottom-right, which on Discover puts it in the same band as
 * the 5-icon action row and the fixed nav — every offset that "clears" one of
 * them collides with another, because all three stack. Rather than keep tuning
 * `bottom-*` values against a moving target, the badge form moves the control
 * out of that band entirely and into the card's own top-right corner, where it
 * competes for space with nothing.
 *
 * IT IS POSITIONED BY ITS PARENT, NOT BY ITSELF. `GameCenterButton` owns its
 * `fixed` placement; this one renders `static` content inside a wrapper the
 * caller positions, so the same component works on the Discover card and on any
 * other card-shaped surface without a second set of offsets to maintain.
 *
 * Kept as a <button> now that there is no `/games` route to navigate to: both
 * forms dispatch `openGame()` and the root-layout `GameModalProvider` does the
 * rest, so the control is a real button in the a11y tree instead of a link
 * pretending to be one.
 */
export function GameCenterBadge({
  /** Visible caption beside the glyph. */
  label = "Games",
  /** Accessible name — supply it when `label` alone is not descriptive. */
  ariaLabel = "Open the Game Center",
  /** Wrapper classes. The caller supplies the position (`absolute`, insets). */
  className = "",
}: {
  label?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => openGame()}
        className="nm-raised group inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-[#0F172A]/90 px-3 py-1.5 text-white backdrop-blur transition duration-150 hover:border-sky-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]"
        title="Game Center"
        aria-label={ariaLabel}
      >
        <span className="text-sm transition-transform duration-150 group-hover:scale-110" aria-hidden="true">
          🎮
        </span>
        <span className="text-[11px] font-medium text-sky-300">{label}</span>
      </button>
    </div>
  );
}

/** localStorage key holding the member's dropped button position, in viewport px. */
const GAME_BUTTON_POSITION_KEY = "cc-game-button-position";
/** The button is `h-14 w-14` — the edge length used when clamping to the viewport. */
const GAME_BUTTON_EDGE_PX = 56;
/** Pointer travel below this is a tap, not a drag. */
const DRAG_THRESHOLD_PX = 6;

/** Clamp a point so the WHOLE button stays inside the current viewport. */
function clampToViewport(x: number, y: number): { x: number; y: number } {
  const maxX = Math.max(0, window.innerWidth - GAME_BUTTON_EDGE_PX);
  const maxY = Math.max(0, window.innerHeight - GAME_BUTTON_EDGE_PX);
  return {
    x: Math.min(Math.max(x, 0), maxX),
    y: Math.min(Math.max(y, 0), maxY),
  };
}

/**
 * Floating Game Center action button.
 *
 * Client Component: interactive controls (hover, focus, client-side
 * navigation) require the "use client" boundary, so this component is safe
 * to nest inside any Server Component, such as the Discover page.
 *
 * The control is rendered as a <button> that dispatches `openGame()` (the
 * root-layout `GameModalProvider` mints the signed URL and renders the
 * fullscreen iframe modal) rather than a link to a games route: the old
 * `/games` hub was removed with the legacy Game Center, and a button is the
 * honest a11y semantic for "opens an overlay" — with no href, there is also no
 * half-hydrated route transition to strand.
 *
 * ── DRAGGABLE ────────────────────────────────────────────────────────────────
 * The button can be dragged anywhere on the viewport (mouse or touch) and
 * remembers where it was dropped in localStorage.
 *
 * - POSITION MODEL: the wrapper is either in its DEFAULT layout (the
 *   `inset-x-0 + bottomOffset + justify-end` classes callers pass) or, once a
 *   position exists, pinned at an explicit `{left, top}`. There is no third
 *   mode: dropping the button writes {x, y} and the default offsets stop
 *   applying, so what the member sees is exactly what was persisted.
 * - POINTER EVENTS, not separate mouse/touch handlers: `pointerdown/move/up`
 *   unify both input types, and `setPointerCapture` keeps the drag alive when
 *   the cursor or finger leaves the 56px button mid-drag — without capture a
 *   fast flick would strand the button halfway between positions.
 * - A 6px MOVE THRESHOLD separates a drag from a tap, so a normal tap still
 *   navigates: below the threshold no position is ever written, and above it
 *   the trailing click is suppressed (see the onClick guard) instead of
 *   firing a navigation the member did not ask for.
 * - CLAMPING keeps the persisted point inside the current viewport on restore
 *   AND on resize, so a position saved on a tall phone cannot strand the
 *   button off-screen after a rotate or a window shrink.
 * - RESTORE IS AN EFFECT, never render-time state: localStorage does not
 *   exist during SSR, and this component is server-rendered too, so reading
 *   it in the render body would throw on the server and desync hydration.
 *   First paint uses the default placement, then the saved position snaps in.
 */
export function GameCenterButton({
  /**
   * Tailwind `bottom-*` utility. A class string rather than a number so the
   * value stays inspectable in the DOM and cannot drift out of sync with the
   * nav height the way an inline `style` would.
   */
  bottomOffset = "bottom-32",
  /** Visible caption under the glyph. */
  label = "Games",
  /** Accessible name — supply it when `label` alone is not descriptive. */
  ariaLabel = "Open the Game Center",
}: {
  bottomOffset?: string;
  label?: string;
  ariaLabel?: string;
}) {
  /* Dropped position, or null while the default `bottomOffset` layout is in
     force. State rather than a ref because the wrapper's classes and inline
     styles are derived from it during render. */
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  /* Mirror of the state, so the pointer-up handler can persist the FINAL
     position synchronously — reading state there would see the render-time
     value from before the last move event. */
  const positionRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  /* Set once the move passes the threshold, cleared by the trailing click.
     A ref, not state: the click handler runs in the same task as pointer-up
     and would otherwise read a stale render-time `false`. */
  const draggedRef = useRef(false);

  function applyPosition(next: { x: number; y: number } | null) {
    positionRef.current = next;
    setPosition(next);
  }

  /* RESTORE, after mount — never during render (see the doc comment above).
     A corrupt or absent key simply leaves the default placement in force. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GAME_BUTTON_POSITION_KEY);
      if (!raw) return;
      const point = JSON.parse(raw) as { x?: unknown; y?: unknown };
      if (typeof point.x === "number" && typeof point.y === "number") {
        const clamped = clampToViewport(point.x, point.y);
        positionRef.current = clamped;
        setPosition(clamped);
      }
    } catch {
      /* Storage disabled or the value unreadable: default placement stands. */
    }
  }, []);

  /* RE-CLAMP ON RESIZE. A point saved near the right edge of a wide window
     would sit off-screen after the window narrows — and a point saved on a
     tall phone ends up under the tab bar after a rotate. */
  useEffect(() => {
    function onResize() {
      const current = positionRef.current;
      if (!current) return;
      const next = clampToViewport(current.x, current.y);
      positionRef.current = next;
      setPosition(next);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function persistPosition() {
    const current = positionRef.current;
    if (!current) return;
    try {
      window.localStorage.setItem(GAME_BUTTON_POSITION_KEY, JSON.stringify(current));
    } catch {
      /* Quota or private mode: the drag still held for this session. */
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      /* Viewport origin captured at DOWN, not at first move: the wrapper
         switches from the default layout to explicit {left, top} on the first
         move, and deriving from the down-time rect keeps that switch seamless —
         the button tracks the pointer 1:1 with no jump. */
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    draggedRef.current = false;
    /* Capture so the drag survives the pointer leaving the 56px button —
       a fast flick would otherwise strand the button mid-flight. */
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    /* Still a tap: move nothing, mark nothing — a press must not nudge the
       button on its own. */
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    draggedRef.current = true;
    /* Stops the browser turning the gesture into a scroll or a native
       link-drag mid-drag (the anchor is also `draggable={false}` and
       `touch-action: none`, so all three layers agree). */
    e.preventDefault();
    applyPosition(clampToViewport(drag.originX + dx, drag.originY + dy));
  }

  function finishDrag(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* The browser already released it (document teardown) — nothing to do. */
    }
    if (drag.moved) persistPosition();
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    /* A drag always ends in a click on mouse and touch; that click must not
       launch a game. Keyboard activation has no preceding drag, so Enter still
       opens the launcher. `preventDefault` also stops the button stealing focus
       after a drag, which would leave a ring on a control the member was
       moving rather than activating. */
    if (draggedRef.current) {
      e.preventDefault();
      draggedRef.current = false;
      return;
    }
    openGame();
  }

  return (
    /* DEFAULT LAYOUT vs DROPPED LAYOUT. While `position` is null the wrapper
       keeps the caller's offset classes (`inset-x-0` + `bottomOffset` +
       `justify-end`) and the button sits where every caller expects it. The
       moment a position exists, those offsets stop applying and the wrapper
       pins at that exact {left, top} — one source of truth, so the visible
       spot and the persisted spot can never disagree.

       `fixed`, not `absolute`, in BOTH modes: it pins the button to the
       VIEWPORT, so it floats above scrolling content instead of travelling
       with it. `z-[60]` is above `Z.nav` (50) so the touch target stays
       reachable where the two overlap, and well below `Z.sheet` (200) so a
       modal still covers it. The default `bottomOffset` stays caller-supplied
       because each surface stacks different obstacles under the button —
       Discover passes `bottom-32` (nav + action row), /messages `bottom-24`. */
    <div
      className={
        position
          ? "pointer-events-none fixed z-[60]"
          : `pointer-events-none fixed inset-x-0 ${bottomOffset} z-[60] flex justify-end px-4`
      }
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      <button
        type="button"
        draggable={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={handleClick}
        className="nm-raised pointer-events-auto group flex h-14 w-14 cursor-grab select-none flex-col items-center justify-center rounded-full border border-sky-400/40 bg-gradient-to-b from-[#1E293B] to-[#0F172A] text-white transition duration-150 hover:-translate-y-0.5 hover:border-sky-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] active:translate-y-0 active:shadow-none active:cursor-grabbing [touch-action:none]"
        title="Game Center"
        aria-label={ariaLabel}
      >
        <span className="text-xl transition-transform duration-150 group-hover:scale-110" aria-hidden="true">
          🎮
        </span>
        {/* THE YELLOW HALF OF THE BLUE/YELLOW PAIR. The chrome above is blue
            (`sky-400` border, slate gradient), so the label carries the warm
            accent — amber, the same value as the profile action bar's Chat button
            and the `nav-pill` active state. Two-tone is what makes this read as a
            deliberate game widget rather than a generic dark FAB.

            `text-amber-300` (not `amber-400`) because it sits on a near-black
            gradient: 400 is vivid enough to vibrate against `#0F172A` at this
            size, 300 keeps it legible without glowing. */}
        <span className="text-[10px] font-semibold text-amber-300">{label}</span>
      </button>
    </div>
  );
}
