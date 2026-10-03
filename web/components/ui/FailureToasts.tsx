"use client";

import { useEffect, useState } from "react";

const FAILURE_EVENT = "couplescorner:action-failure";
const SUCCESS_EVENT = "couplescorner:action-success";

export function notifyFailure(message: string) {
  window.dispatchEvent(new CustomEvent(FAILURE_EVENT, { detail: message }));
}

/**
 * Announce a successful action (e.g. "Invite copied to clipboard").
 *
 * Kept deliberately separate from `notifyFailure` so a confirmation can never
 * be mistaken for a problem: the two render with different colours, and a
 * member glancing at the screen can tell which happened without reading it.
 */
export function notifySuccess(message: string) {
  window.dispatchEvent(new CustomEvent(SUCCESS_EVENT, { detail: message }));
}

/** Keep inline feedback and a dismissible toast in sync, including repeat failures. */
export function useActionError() {
  const [error, setError] = useState<string | null>(null);
  function reportError(message: string | null) {
    setError(message);
    if (message) notifyFailure(message);
  }
  return [error, reportError] as const;
}

/**
 * Pick the message to show for a failed action.
 *
 * WHY STRINGS ARE ACCEPTED, NOT JUST `Error`. The Server Actions in this app
 * return `{ ok: false, error: string }` — they do not throw across the RSC
 * boundary, because a thrown error becomes an opaque digest in production. So
 * callers routinely pass an already-extracted `result.error` STRING here.
 *
 * This function used to do `error instanceof Error ? error.message : ""` and
 * nothing else, which meant a string argument produced `message === ""`, matched
 * no network pattern, and fell straight through to the generic `fallback`. The
 * server's actual reason — "Request already sent", "You're already connected",
 * a PostgREST schema-cache error, an RLS violation — was discarded and the
 * member was shown a fixed sentence instead. That is precisely why the deck's
 * Like button reported the same uninformative "Couldn't send your like" for
 * every distinct database failure: the diagnostic was being thrown away at the
 * last step, at the one place that displayed it.
 *
 * So: a non-empty string is used as-is. The network heuristic then only
 * overrides the copy when the message really does describe a transport problem,
 * which is the case it was written for.
 */
export function failureMessage(error: unknown, fallback: string) {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  if (message && /fetch|network|offline|timeout|timed out|abort/i.test(message)) {
    return "Connection interrupted. Check your connection. If you were saving or sending, check whether it completed before retrying.";
  }
  // An empty/whitespace message carries no information, so the fallback is the
  // honest thing to show rather than a blank toast.
  return message.trim() || fallback;
}

export function FailureToasts() {
  const [notice, setNotice] = useState<{
    message: string;
    id: number;
    tone: "failure" | "success";
  } | null>(null);

  useEffect(() => {
    let id = 0;
    const onNotice = (event: Event, tone: "failure" | "success") => {
      const message: unknown = (event as CustomEvent).detail;
      if (typeof message === "string") setNotice({ message, id: ++id, tone });
    };
    const onFailure = (event: Event) => onNotice(event, "failure");
    const onSuccess = (event: Event) => onNotice(event, "success");
    window.addEventListener(FAILURE_EVENT, onFailure);
    window.addEventListener(SUCCESS_EVENT, onSuccess);
    return () => {
      window.removeEventListener(FAILURE_EVENT, onFailure);
      window.removeEventListener(SUCCESS_EVENT, onSuccess);
    };
  }, []);

  return (
    <div aria-live="assertive" aria-atomic="true" className="pointer-events-none fixed inset-x-4 top-4 z-[200] mx-auto max-w-md">
      {notice && <div key={notice.id} role="status" className={[
        "pointer-events-auto flex items-start gap-4 rounded-2xl border bg-[#0F172A] p-4 text-sm text-white shadow-2xl",
        notice.tone === "success" ? "border-emerald-400/50" : "border-orange-300/50",
      ].join(" ")}>
        <p className="flex-1 leading-6">{notice.message}</p>
        <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 text-xl hover:bg-white/10">×</button>
      </div>}
    </div>
  );
}
