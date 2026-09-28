"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long the call controls stay visible after the last interaction. */
const IDLE_MS = 4_000;

interface UseAutoHideControlsOptions {
  /** Milliseconds of inactivity before the chrome fades out. */
  idleMs?: number;
  /** Set false to pin the chrome open (e.g. while a sheet is open). */
  enabled?: boolean;
  /** Force the chrome visible, e.g. while the user is actively tapping. */
  pinned?: boolean;
}

/**
 * Auto-hiding chrome for the full-screen call / live surfaces.
 *
 * A call screen is only useful if it gets out of the way: the whole point of
 * the edge-to-edge video is an unobstructed view of the other person, and a
 * control bar parked over their face defeats it. So the controls are visible
 * for a few seconds after any interaction and then fade out completely,
 * leaving only the picture. Any pointer move, tap, key press or touch brings
 * them straight back.
 *
 * Two details that matter and are easy to get wrong:
 *
 *   • The listeners are attached to `window`, NOT to the control bar. A
 *     listener on the bar itself would only fire while the pointer happened
 *     to be over it, so the chrome would fade out and then be impossible to
 *     bring back once the pointer left.
 *
 *   • `pointermove` fires constantly, so the idle timer is reset by
 *     rescheduling a single timeout rather than by clearing and re-creating
 *     one on every event — a mousemove can fire 60+ times a second and
 *     thrashing the timer that hard causes visible jank on low-end phones.
 *
 * The controls are hidden with opacity/pointer-events rather than unmounted,
 * so the fade is a real transition instead of a pop, and so a screen reader
 * never loses focus to a control that vanished from the DOM.
 */
export function useAutoHideControls({
  idleMs = IDLE_MS,
  enabled = true,
  pinned = false,
}: UseAutoHideControlsOptions = {}) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | null>(null);

  const reveal = useCallback(() => {
    setVisible(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (!enabled || pinned) return;
    timerRef.current = window.setTimeout(() => setVisible(false), idleMs);
  }, [enabled, idleMs, pinned]);

  // Restart the countdown whenever the call is (re)enabled or the pinning
  // changes, so controls never start life already faded out.
  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }
    reveal();
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [enabled, reveal]);

  useEffect(() => {
    if (!enabled) return;
    // `pointermove` is throttled to roughly one event per animation frame.
    // Without this a trackpad fling fires hundreds of events per second and
    // starves the main thread that is also decoding the incoming video.
    let queued = false;
    function onPointerMove() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        reveal();
      });
    }
    function onKeyDown() {
      reveal();
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", reveal, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", reveal, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", reveal);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", reveal);
    };
  }, [enabled, reveal]);

  return { visible, reveal };
}
