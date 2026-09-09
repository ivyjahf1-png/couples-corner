import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import type { ConversationSummaryView } from "@/lib/feature/types";

/** One row in the /messages conversation list (unread badge included). */
export function ConversationItem({ conversation }: { conversation: ConversationSummaryView }) {
  return (
    <Link
      href={`/messages/${conversation.id}`}
      className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-muted"
    >
      <Avatar name={conversation.name} kind={conversation.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-ink-900">{conversation.name}</p>
          <span className="shrink-0 text-xs text-ink-500">{conversation.at}</span>
        </div>
        <p className="truncate text-sm text-ink-600">{conversation.preview}</p>
      </div>
      {conversation.unread > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
          {conversation.unread}
        </span>
      ) : null}
    </Link>
  );
}
