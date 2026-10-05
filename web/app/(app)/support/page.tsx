"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Paperclip, Send, Smile } from "lucide-react";
import { PageLock } from "@/components/app/PageHeader";

/**
 * CUSTOMER SERVICE — a dedicated support chat screen.
 *
 * Layout mirrors the member conversation, in miniature: a fixed `PageLock`
 * head (agent identity + the encryption notice), a scrolling thread, and a
 * composer that stays pinned via `sticky bottom-0` — so this screen keeps the
 * shell's SINGLE scroll region instead of inventing a second one.
 *
 * THE THREAD IS LOCAL. There is no support-ticket backend: messages live in
 * component state and the agent's acknowledgement is a single scripted reply.
 * That is deliberately honest — a fake "delivered to an agent" claim would be
 * exactly the kind of state this product refuses to render without a server
 * behind it. When a tickets API lands, `send()` becomes a mutation and the
 * shape below does not change.
 */

interface SupportMessage {
  id: number;
  from: "agent" | "member";
  body: string;
  time: string;
}

/** The messages the member opens with. */
const OPENING_MESSAGES: SupportMessage[] = [
  {
    id: 1,
    from: "agent",
    body: "Welcome to Couples Corner Customer Service 👋 How can we help you today?",
    time: "09:00",
  },
  {
    id: 2,
    from: "agent",
    body: "Replies usually land within a few minutes, seven days a week.",
    time: "09:00",
  },
];

/** Local clock time for messages the member sends. */
function stamp(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Shared chrome for the composer's icon buttons. */
const composerIcon =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]";

export default function SupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>(OPENING_MESSAGES);
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const replyTimer = useRef<number | null>(null);

  /* Pin the thread to the newest message whenever it grows. `bodyRef` is
     PageLock's own scroll region, so this writes to the ONE scroller. */
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  /* Drop the pending scripted reply if the member navigates away first. */
  useEffect(
    () => () => {
      if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
    },
    [],
  );

  function send() {
    const body = draft.trim();
    if (!body) return;
    setMessages((prev) => [...prev, { id: Date.now(), from: "member", body, time: stamp() }]);
    setDraft("");
    /* ONE acknowledgement at a time: three fast messages must not buy three
       canned replies. The ref gates the timer; a null means "none pending". */
    if (replyTimer.current !== null) return;
    replyTimer.current = window.setTimeout(() => {
      replyTimer.current = null;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          from: "agent",
          body: "Thanks for reaching out! An agent will be with you shortly.",
          time: stamp(),
        },
      ]);
    }, 900);
  }

  return (
    <PageLock
      className="mx-auto w-full max-w-2xl"
      bodyClassName="pb-4"
      bodyRef={bodyRef}
      head={
        <div>
          {/* Agent identity row. The green dot is the presence cue; the initials
              disc stands in for an avatar no support backend has yet. */}
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FF7A00]/20 text-sm font-black text-[#FFA040]">
              CS
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#020617] bg-emerald-400"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">Customer Service</p>
              <p className="text-xs text-emerald-300">Online · typically replies in minutes</p>
            </div>
            <Lock className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          </div>

          {/* THE ENCRYPTION NOTICE BANNER. Amber, not brand orange — orange is
              the call-to-action colour on every composer this app ships, and a
              security notice wearing it would read as a button. */}
          <div
            role="note"
            className="flex items-start gap-2 border-t border-amber-400/20 bg-amber-500/10 px-4 py-2.5"
          >
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
            <p className="text-[11px] leading-relaxed text-amber-200">
              <span className="font-bold">End-to-end encrypted.</span> This conversation is
              private to your account and is never shared with other members.
            </p>
          </div>
        </div>
      }
    >
      <div className="flex min-h-full flex-col">
        {/* The thread. `flex-1` absorbs every pixel above the composer, so the
            composer sits at the bottom even when the conversation is short. */}
        <ul aria-label="Conversation" className="flex flex-1 flex-col gap-3 py-4">
          {messages.map((message) => (
            <li
              key={message.id}
              className={[
                "flex max-w-[85%] flex-col gap-1 px-3.5 py-2.5 text-sm",
                message.from === "agent"
                  ? "self-start rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.06]"
                  : "self-end rounded-2xl rounded-br-sm bg-[#FF7A00]",
              ].join(" ")}
            >
              <p className="whitespace-pre-wrap break-words text-white">{message.body}</p>
              <span
                className={
                  message.from === "agent"
                    ? "self-end text-[10px] text-slate-400"
                    : "self-end text-[10px] text-white/70"
                }
              >
                {message.time}
              </span>
            </li>
          ))}
        </ul>

        {/* COMPOSER — `sticky bottom-0` pins it to the bottom edge of PageLock's
            scroll region while the thread scrolls beneath it, so the input never
            leaves the viewport and the shell keeps exactly one scroller. The
            opaque backdrop is load-bearing: without it messages would show
            through the controls mid-scroll. */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          className="sticky bottom-0 flex items-center gap-2 border-t border-white/10 bg-[#020617]/95 px-3 py-3 backdrop-blur"
        >
          <button type="button" aria-label="Attach a file" title="Attach" className={composerIcon}>
            <Paperclip className="h-5 w-5" aria-hidden />
          </button>

          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Message Customer Service"
            placeholder="Type a message..."
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#FF7A00]"
          />

          <button type="button" aria-label="Emoji" title="Emoji" className={composerIcon}>
            <Smile className="h-5 w-5" aria-hidden />
          </button>

          <button
            type="submit"
            disabled={draft.trim().length === 0}
            aria-label="Send message"
            title="Send"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FF7A00] text-white transition hover:bg-[#FF8A1F] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA040]"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>
    </PageLock>
  );
}
