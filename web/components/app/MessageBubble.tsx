// MessageBubble.tsx
//
// One message bubble in a conversation thread. Supports optimistic status
// ("sending" shows a spinner, "failed" a retry hint) so the Firestore
// onSnapshot wire-up later needs no UI change.
//
// Colours come from the theme tokens in globals.css rather than literals, for
// the same reason `LiveConversationThread` does: a hardcoded `text-white` here
// is invisible on the light canvas, and this component is a second bubble
// renderer that must not be able to drift from the live one.
import { DotLoader } from "@/components/app/LoadingState";
import type { MessageView } from "@/lib/feature/types";

export function MessageBubble({ message }: { message: MessageView }) {
  const mine = message.sender === "me";
  return (
    <li className={mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 sm:max-w-[70%]",
          mine
            ? "rounded-br-md text-[var(--chat-out-text)] [background-image:linear-gradient(135deg,var(--chat-out-from),var(--chat-out-to))]"
            : "rounded-bl-md border text-[var(--chat-in-text)] [background-color:var(--chat-in-bg)] [border-color:var(--chat-in-border)]",
          message.status === "failed" ? "border-danger-500/40" : "",
        ].join(" ").trim()}
      >
        {message.body}
        <span
          aria-hidden
          className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--chat-muted)]"
        >
          {message.status === "sending" ? <DotLoader /> : null}
          {message.status === "failed" ? "Not sent — tap to retry" : message.at}
        </span>
      </div>
    </li>
  );
}
