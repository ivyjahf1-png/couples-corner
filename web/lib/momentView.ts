/**
 * The Moment screen's view contract, shared by the page, the feed and the header.
 *
 * ── WHY THIS IS ITS OWN MODULE ───────────────────────────────────────────────
 * Both `MomentFeed` (which renders the panels) and `MobileBackHeader` (which
 * renders the top-right toggle) need the same three facts: the query parameter
 * name, the value that means "community", and the event used to announce a view
 * change.
 *
 * Putting them in either component would mean the other importing it. The header
 * is rendered by `AppShell` on nearly every route, so importing `MomentFeed` into
 * it would pull the whole feed subtree into every page's client bundle just to
 * read a string constant. This module is dependency-free and free to import
 * anywhere.
 */

/** The two panels on the Moment screen. */
export type MomentViewTab = "videos" | "community";

/** Query parameter that carries the active view in the URL. */
export const MOMENT_VIEW_PARAM = "view";

/** The only value of `MOMENT_VIEW_PARAM` that selects the community timeline. */
export const MOMENT_VIEW_COMMUNITY = "community";

/**
 * Name of the DOM event `MomentFeed` dispatches after it writes the active view
 * to the address bar.
 *
 * ── WHY AN EVENT AND NOT SHARED STATE ───────────────────────────────────────
 * `MomentFeed` writes the view with `history.replaceState`, which by design
 * re-renders NOTHING — that is the point, since routing would remount the panels
 * and throw away their scroll positions. A header that wants to know the current
 * view therefore has no render to hang an update on, and `useSearchParams` is not
 * available to it either (it sits on every route via `AppShell`, so it would
 * force an app-wide Suspense boundary just to relabel one button).
 *
 * A custom event is the smallest thing that survives `replaceState`: the writer
 * already knows the moment the URL changed, so it announces it. The header stays
 * a SUBSCRIBER rather than a second owner of the view, so the URL remains the
 * single source of truth and the two cannot disagree.
 */
export const MOMENT_VIEW_EVENT = "couples-corner:moment-view";

/**
 * Read the active view from a query string.
 *
 * Takes the search string rather than reading `window` so it stays pure and
 * testable, and safe to call during render or from a server context.
 *
 * An unrecognised value resolves to `"videos"`, never to the raw string: the
 * parameter is user-editable, and passing an arbitrary value through into client
 * state would smuggle junk into the UI.
 */
export function momentViewFromSearch(search: string): MomentViewTab {
  const value = new URLSearchParams(search).get(MOMENT_VIEW_PARAM);
  return value === MOMENT_VIEW_COMMUNITY ? "community" : "videos";
}

/**
 * The href that switches AWAY from `current`.
 *
 * Used by the header toggle so the control always navigates to the OTHER view
 * rather than to a fixed destination. That is what keeps it a toggle instead of
 * a one-way door — which matters now that the in-page pill switcher has been
 * removed and this control is the only route between the two panels.
 */
export function momentViewToggleHref(current: MomentViewTab): string {
  return current === "community"
    ? "/feed"
    : `/feed?${MOMENT_VIEW_PARAM}=${MOMENT_VIEW_COMMUNITY}`;
}

/**
 * Subscribe to changes in the active view, for `useSyncExternalStore`.
 *
 * The URL is the store. `MomentFeed` writes it and announces the write on
 * `MOMENT_VIEW_EVENT`; `popstate` is included because the browser's own back and
 * forward buttons also change the query, and no `replaceState` event fires for
 * those.
 *
 * ── WHY `useSyncExternalStore` AND NOT `useState` + `useEffect` ──────────────
 * Because the store is updated OUTSIDE React (by the address bar), this is
 * exactly the case the hook exists for. The naive shape — `useState` seeded in an
 * effect, or a listener that calls `setState` — has two problems here:
 *
 *   • Seeding in an effect means the first paint shows a stale label, and
 *     `setState` inside an effect body is a cascading render React explicitly
 *     warns against.
 *   • Effect ORDER is the killer. Child effects run before parent effects, so
 *     `MomentFeed` — a child — announces the initial view BEFORE this header, a
 *     parent, has attached its listener. A subscribe-only component therefore
 *     misses the very first announcement and shows the wrong label until the
 *     member navigated a second time.
 *
 * `useSyncExternalStore` reads the snapshot during render instead, so it is
 * correct on the first paint regardless of effect ordering, and re-renders only
 * when the snapshot actually changes.
 */
export function subscribeToMomentView(onStoreChange: () => void): () => void {
  window.addEventListener(MOMENT_VIEW_EVENT, onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener(MOMENT_VIEW_EVENT, onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

/**
 * The current query string — the snapshot for `useSyncExternalStore`.
 *
 * Returns the raw `search` rather than a parsed tab, because a string is
 * compared with `Object.is` and so only triggers a re-render when the query
 * genuinely differs. Parsing here would collapse `/feed?view=x` and `/feed` to
 * the same `"videos"` value, which is fine, but returning the raw string keeps
 * this snapshot trivially pure and obviously cache-safe.
 *
 * `search` (not `href`) is deliberate: it is what the view is encoded in, and
 * including the path or hash would make the header re-render for unrelated
 * changes.
 */
export function getMomentViewSnapshot(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}

/**
 * Server snapshot. Always empty, so the server and the client's first render
 * agree and React does not report a hydration mismatch — the real value arrives
 * with the same client render that reads it.
 */
export function getMomentViewServerSnapshot(): string {
  return "";
}