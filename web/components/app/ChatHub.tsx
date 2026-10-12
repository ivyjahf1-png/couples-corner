"use client";

import { useCallback, useState, type TouchEvent as ReactTouchEvent } from "react";
import Link from "next/link";
import {
  Clock,
  Mail,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Avatar } from "@/components/app/Avatar";
import { Chip } from "@/components/ui/Chip";
import type { InboxChat } from "@/components/app/MessagesInbox";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Localized timestamp (MM-DD HH:MM) in the reader's timezone. */
function formatStamp(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ------------------------------------------------------------------ */
/* Icon button                                                         */
/* ------------------------------------------------------------------ */

interface IconButtonProps {
  label: string;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function IconButton({ label, active = false, children, className, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={[
        "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition hover:bg-white/10 focus:outline-none focus-visible:outline-2 focus-visible:outline-orange-400/60",
        active
          ? "border-orange-400/30 bg-orange-500/10 shadow-[0_0_12px_rgba(255,87,34,0.25)]"
          : "",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Top stories row — horizontal, swipeable cell list                    */
/* ------------------------------------------------------------------ */

interface Story {
  name: string;
  initials: string;
  active: boolean;
}

const SAMPLE_STORIES: Story[] = [
  { name: "Alex Rivera", initials: "AR", active: true },
  { name: "Jordan Lee", initials: "JL", active: false },
  { name: "Taylor Morgan", initials: "TM", active: false },
  { name: "Casey Kim", initials: "CK", active: false },
];

function StoriesRow({ displayName }: { displayName: string }) {
  return (
    <section aria-label="Top stories" className="scrollbar-thin">
      <div className="flex w-max items-center gap-3 overflow-hidden">
        {SAMPLE_STORIES.map((story) => (
          <div
            key={story.initials}
            className="group flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2 transition duration-200 hover:bg-white/[0.08]"
          >
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[#0F172A] px-[2px]">
                <Avatar name={story.name} size="xl" />
              </span>
              <span
                className={[
                  "absolute inset-0 rounded-full bg-orange-500/20 transition-opacity duration-200",
                  story.active ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                <span className="flex h-full w-full items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </span>
            </span>
            <span className="text-center text-[11px] font-medium text-ink-200">
              {story.name.split(" ").map((w) => w[0]).join("")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}


/* ------------------------------------------------------------------ */
/* Best matches featured section — horizontal, swipeable cards          */
/* ------------------------------------------------------------------ */

interface BestMatch {
  name: string;
  initials: string;
  preview: string;
  badge?: string;
  active?: boolean;
}

const BEST_MATCHES: BestMatch[] = [
  { name: "Alex Rivera", initials: "AR", preview: "Looking great today 💕", badge: "VIP" },
  { name: "Jordan Lee", initials: "JL", preview: "Weekend trip plans 🔮", badge: "VIP" },
  { name: "Taylor Morgan", initials: "TM", preview: "Let's find a date tonight 🌙" },
  { name: "Casey Kim", initials: "CK", preview: "Coffee next week ☕" },
];

function BestMatchesSection() {
  return (
    <section aria-label="Best matches" className="scrollbar-thin">
      <div className="flex w-max items-center gap-3 overflow-hidden">
        {BEST_MATCHES.map((m) => (
          <div
            key={m.name}
            className="group flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2 transition duration-200 hover:bg-white/[0.08]"
          >
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[#FF5722]/15 px-[2px]">
                <Avatar name={m.name} size="xl" />
              </span>
              {m.badge ? (
                <span className="absolute inset-0 rounded-full bg-[#FF5722] p-1">
                  <Chip
                    tone="brand"
                    leadingDot
                    label={m.badge}
                    className="text-[10px] font-semibold"
                  />
                </span>
              ) : (
                <span className="absolute inset-0 rounded-full bg-white/10" />
              )}
            </span>
            <span className="text-center text-[11px] font-medium text-ink-200">
              {m.name.split(" ").map((w) => w[0]).join("")}
            </span>
            {m.preview ? (
              <span className="text-center text-[10px] leading-tight text-ink-300">{m.preview}</span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Conversation row                                                    */
/* ------------------------------------------------------------------ */

interface ConversationRowProps {
  chat: InboxChat;
}

function ConversationRow({ chat }: ConversationRowProps) {
  return (
    <Link href={chat.href}>
      <div className="flex shrink-0 items-center gap-3 px-4 py-3 transition hover:bg-white/[0.06]">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-[#0F172A] px-[2px]">
            <Avatar name={chat.name} size="lg" />
          </span>
          {chat.isOnline ? (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0F172A]" />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-white">
            <span className="block truncate">{chat.name}</span>
            <span className="block text-xs text-ink-400">{formatStamp(chat.lastMessageAt)}</span>
          </h1>
          {chat.preview ? (
            <p className="truncate text-xs leading-snug text-ink-300">{chat.preview}</p>
          ) : null}
        </div>
        {chat.unread > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF5722] px-1.5 text-[10px] font-bold text-white">
            {chat.unread}
          </span>
        ) : null}
        <IconButton label="More">
          <MoreHorizontal className="h-4 w-4 text-ink-300" />
        </IconButton>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* ChatHub — main hub                                                  */
/* ------------------------------------------------------------------ */

interface ChatHubProps {
  chats: InboxChat[];
  displayName: string;
}

export function ChatHub({ chats, displayName }: ChatHubProps) {
  const [tab, setTab] = useState<"chat" | "activity">("chat");
  const [dragX, setDragX] = useState(0);
  const [activeRow, setActiveRow] = useState<number | null>(null);

  const committed = dragX < -120;

  const onTouchStart = useCallback((e: ReactTouchEvent, index: number) => {
    setActiveRow(index);
  }, []);

  const onTouchMove = useCallback((e: ReactTouchEvent, index: number) => {
    const x = e.touches?.[0]?.clientX ?? 0;
    if (activeRow !== index) return;
    setDragX(-(x - 300));
  }, [activeRow]);

  const onTouchEnd = useCallback(() => {
    if (committed) {
      setDragX(0);
    } else {
      setDragX(0);
    }
    setActiveRow(null);
  }, [committed, activeRow]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* Fixed header — Message + Filter/Search. */}
      <header className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.04] px-4 py-2">
        <Link href={chats[0]?.href ?? "/messages"}>
          <h1 className="flex items-center gap-2 text-lg font-bold text-white">
            <Mail className="h-4 w-4 text-orange-300" aria-hidden />
            Message
          </h1>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton label="Filter conversations">
            <SlidersHorizontal className="h-4 w-4 text-ink-300" />
          </IconButton>
          <IconButton label="Search messages">
            <Search className="h-4 w-4 text-ink-300" />
          </IconButton>
        </div>
      </header>

      {/* Scrollable page body (single scroll region — keeps the bottom nav from bouncing). */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Top stories — horizontal, swipeable. */}
        <StoriesRow displayName={displayName} />

        {/* Best matches featured section — horizontal, swipeable cards. */}
        <BestMatchesSection />

        {/* Tab switcher + chat list. */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Segmented Chat / Activity tab switcher. */}
          <div className="flex shrink-0 items-center gap-1.5 self-start rounded-full bg-white/[0.04] p-1 pb-2">
            <button
              type="button"
              aria-selected={tab === "chat"}
              aria-label="Chat conversations"
              onClick={() => setTab("chat")}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                tab === "chat"
                  ? "bg-[#FF5722] text-white shadow-[0_2px_12px_-2px_rgba(255,87,34,0.5)]"
                  : "text-ink-300 hover:bg-white/5",
              ].join(" ")}
            >
              <span className="text-base" aria-hidden />
              Chat
            </button>
            <button
              type="button"
              aria-selected={tab === "activity"}
              aria-label="Activity log"
              onClick={() => setTab("activity")}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                tab === "activity"
                  ? "bg-[#FF5722] text-white shadow-[0_2px_12px_-2px_rgba(255,87,34,0.5)]"
                  : "text-ink-300 hover:bg-white/5",
              ].join(" ")}
            >
              <Clock className="h-4 w-4" aria-hidden />
              Activity
            </button>
          </div>

          {/* Scrollable list of conversation rows. */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
            onTouchStart={(e) => onTouchStart(e, -1)}
            onTouchMove={(e) => onTouchMove(e, -1)}
            onTouchEnd={onTouchEnd}
          >
            <ul className="divide-y divide-white/[0.06]">
              {chats.length === 0 ? (
                <li className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                  <Mail className="h-8 w-8 text-[#A09AB0]" aria-hidden />
                  <p className="text-sm font-bold text-white">No conversations yet</p>
                  <p className="max-w-xs text-xs leading-5 text-[#A09AB0]">
                    Connect with someone on Discover and start a private chat.
                  </p>
                </li>
              ) : (
                chats.map((chat) => (
                  <ConversationRow
                    key={chat.key}
                    chat={chat}
                  />
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatHub;


