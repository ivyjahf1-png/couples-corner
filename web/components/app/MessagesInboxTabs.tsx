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
    <div className="mb-4 flex items-center gap-2">
      <div
        role="tablist"
        aria-label="Inbox view"
        className="flex flex-1 gap-1 rounded-xl border border-ink-700 bg-surface p-1"
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
                  ? "bg-gradient-to-b from-orange-500/25 to-orange-500/10 text-white ring-1 ring-orange-400/40"
                  : "text-ink-300 hover:bg-white/[0.06] hover:text-white",
              ].join(" ")}
            >
              <Icon name={id === "chat" ? "chat" : "sparkle"} className="h-4 w-4" />
              {id === "chat" ? "Chat" : "Call"}
              {id === "chat" && activeCount > 0 ? (
                <span className="rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums text-ink-200">
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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink-700 bg-surface text-orange-300 transition hover:border-orange-400/40 hover:bg-orange-500/10"
      >
        <Icon name="sparkle" className="h-5 w-5" />
      </Link>
    </div>
  );
}