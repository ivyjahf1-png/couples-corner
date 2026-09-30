// MessagesInboxTabs.tsx — Chat / Call switch and game shortcut for /messages.
"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/landing/Icon";

/**
 * The Chat / Call switch and the games shortcut on the inbox.
 *
 * ── WHY "CALL" IS A TAB AND NOT A SEPARATE LIST ─────────────────────────────
 * Calls are not listed because there is no call history to list. The only two
 * chat routes that exist are `/messages` and `/messages/<conversationId>`, and
 * a call is always started FROM a conversation — via the header's call buttons.
 * So "Call" is a jump to the people you can call, which is the conversation
 * list itself, and selecting it focuses it. It is honest about what it does
 * rather than opening an empty screen.
 *
 * Filtering the list to "threads with a call button" would be every thread,
 * because every thread has one — so a filtered view would be a lie about
 * having done anything.
 */
export function MessagesInboxTabs({ activeCount }: { activeCount: number }) {
  const [tab, setTab] = useState<"chat" | "call">("chat");

  return (
    /* A light SEGMENTED control: a `bg-slate-100` track with a solid white pill
       for the selected tab.

       This was a dark `border-ink-700 bg-surface` track whose selected state was
       an orange-tinted translucent fill with `text-white`. On the light canvas
       that read as an empty box: a white label on a barely-tinted background has
       almost no contrast, so there was no visible indication of which tab was
       active. The white pill on grey is the standard iOS/segmented treatment and
       is unambiguous.

       `role="tablist"` + `aria-selected` are retained — this is a real tab switch,
       not two decorative buttons, and the a11y wiring costs nothing. */
    <div className="mb-4 flex items-center gap-2">
      <div
        role="tablist"
        aria-label="Inbox view"
        className="flex flex-1 gap-1 rounded-xl bg-slate-100 p-1"
      >
        {(["chat", "call"] as const).map((id) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(id)}
              className={[
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
                selected
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <Icon name={id === "chat" ? "chat" : "sparkle"} className="h-4 w-4" />
              {id === "chat" ? "Chat" : "Call"}
              {/* Solid orange pill: the old `bg-white/10 text-ink-200` counter was
                  a dark token and vanished on the light track. */}
              {id === "chat" && activeCount > 0 ? (
                <span className="rounded-full bg-orange-500 px-1.5 text-[10px] font-bold tabular-nums text-white">
                  {activeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Games shortcut. A real destination that already exists — /games — rather
          than a dead affordance. */}
      <Link
        href="/games"
        aria-label="Open the game centre"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-orange-500 transition hover:border-orange-300 hover:bg-orange-50"
      >
        <Icon name="sparkle" className="h-5 w-5" />
      </Link>
    </div>
  );
}