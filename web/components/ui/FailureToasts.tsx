"use client";

import { useEffect, useState } from "react";

const FAILURE_EVENT = "couplescorner:action-failure";

export function notifyFailure(message: string) {
  window.dispatchEvent(new CustomEvent(FAILURE_EVENT, { detail: message }));
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

export function failureMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/fetch|network|offline|timeout|timed out|abort/i.test(message)) {
    return "Connection interrupted. Check your connection. If you were saving or sending, check whether it completed before retrying.";
  }
  return fallback;
}

export function FailureToasts() {
  const [notice, setNotice] = useState<{ message: string; id: number } | null>(null);
  useEffect(() => {
    let id = 0;
    const onFailure = (event: Event) => {
      const message: unknown = (event as CustomEvent).detail;
      if (typeof message === "string") setNotice({ message, id: ++id });
    };
    window.addEventListener(FAILURE_EVENT, onFailure);
    return () => window.removeEventListener(FAILURE_EVENT, onFailure);
  }, []);
  return (
    <div aria-live="assertive" aria-atomic="true" className="pointer-events-none fixed inset-x-4 top-4 z-[200] mx-auto max-w-md">
      {notice && <div key={notice.id} className="pointer-events-auto flex items-start gap-4 rounded-2xl border border-orange-300/50 bg-[#0F172A] p-4 text-sm text-white shadow-2xl">
        <p className="flex-1 leading-6">{notice.message}</p>
        <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 text-xl hover:bg-white/10">×</button>
      </div>}
    </div>
  );
}
