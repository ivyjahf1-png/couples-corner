import Link from "next/link";
import { Icon } from "@/components/landing/Icon";
import { isMissedCall, missedCallLabel, type CallLogEntry } from "@/lib/feature/types";

/**
 * The "Missed Audio Call" / "Missed Video Call" card.
 *
 * ── WHY IT IS A SEPARATE TIMELINE, NOT A MESSAGE ──────────────────────────────
 * A call that rang out is an EVENT, not something anyone typed. Rendering it as
 * a message would put words in the other person's mouth, and it would sort by
 * the wrong key: the thread orders on `messages.created_at`, which is when the
 * row was written, not when the phone rang. So calls are merged in by their
 * real `started_at` and drawn as their own card. See migration 048.
 *
 * ── WHY IT IS CENTRED AND DIM ────────────────────────────────────────────────
 * Alignment is the signal the thread already relies on: sent right, received
 * left, both saturated. A missed call is neither — it belongs to the caller's
 * experience, not to a message either side sent — so it is centred and muted
 * rather than forced into one side. Putting it on the callee's side would read
 * as "they said something"; putting it on the caller's would read as "I said
 * something". Both are false.
 *
 * The arrow points at the person the member has to call BACK, which is the one
 * action this card exists to offer.
 */
export function MissedCallCard({
  entry,
  viewerId,
}: {
  entry: CallLogEntry;
  viewerId: string;
}) {
  // Only renderable states are shown. A connected-then-ended call is not a
  // missed call and must not be labelled as one.
  if (!isMissedCall(entry)) return null;

  const outgoing = entry.callerId === viewerId;
  const isVideo = entry.mode === "video";
  // An incoming missed call is the one that actually needs a callback arrow; on
  // your own missed outgoing there is nobody to call back.
  const showCallback = !outgoing;
  const href = `/call/${entry.conversationId}/${entry.mode}`;

  const body = (
    <>
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300"
      >
        {isVideo ? <Icon name="live" className="h-4 w-4" /> : <Icon name="chat" className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--chat-muted)]">
          {missedCallLabel(entry.mode)}
        </span>
        <span className="block text-[11px] text-[var(--chat-muted)]/80">
          {outgoing ? "No answer" : "Tap to call back"}
        </span>
      </span>
      {showCallback ? (
        <Icon name="arrow" className="h-4 w-4 shrink-0 text-[var(--chat-muted)]" />
      ) : null}
    </>
  );

  const className =
    "flex w-full max-w-[80%] items-center gap-2.5 rounded-2xl border border-dashed border-rose-400/25 bg-rose-500/[0.06] px-3 py-2 text-left transition sm:max-w-[70%]";

  // The whole card is the control when there is someone to call back, and a
  // non-interactive record when there is not — a clickable-looking element that
  // does nothing is worse than a plainly inert one.
  return showCallback ? (
    <Link
      href={href}
      className={`${className} hover:border-rose-400/45 hover:bg-rose-500/[0.11]`}
    >
      {body}
    </Link>
  ) : (
    <div className={className} aria-label={missedCallLabel(entry.mode)}>
      {body}
    </div>
  );
}
