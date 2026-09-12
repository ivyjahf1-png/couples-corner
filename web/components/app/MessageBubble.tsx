import { DotLoader } from "@/components/app/LoadingState";
import type { MessageView } from "@/lib/feature/types";

/**
 * One message bubble in a conversation thread. Supports optimistic status
 * ("sending" shows a spinner, "failed" a retry hint) so the Firestore
 * onSnapshot wire-up later needs no UI change.
 */
export function MessageBubble({ message }: { message: MessageView }) {
  const mine = message.sender === "me";
  return (
    <li className={mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 sm:max-w-[70%]",
          mine
            ? "rounded-br-md bg-brand-700 text-white"
            : "rounded-bl-md border border-ink-200 bg-surface text-ink-900",
          message.status === "failed" ? "border-danger-300" : "",
        ].join(" ").trim()}
      >
        {message.body}
        <span
          aria-hidden
          className={[
            "mt-1 flex items-center gap-1.5 text-[11px]",
            mine ? "text-white/70" : "text-ink-500",
          ].join(" ").trim()}
        >
          {message.status === "sending" ? <DotLoader /> : null}
          {message.status === "failed" ? "Not sent — tap to retry" : message.at}
        </span>
      </div>
    </li>
  );
}
