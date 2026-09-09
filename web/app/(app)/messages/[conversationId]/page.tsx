import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { MessageComposer } from "../Composer";
import { demoConversations, demoThread } from "@/lib/demo/demo-data";

/**
 * A single conversation thread. Demo messages are rendered to design the
 * thread anatomy; real messages come from the conversations/{id}/messages
 * subcollection once Firestore is connected.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const conversation = demoConversations.find((c) => c.id === conversationId);
  if (!conversation) notFound();

  return (
    <div className="flex h-full min-h-[70dvh] flex-col gap-4">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-ink-200 pb-4">
        <Link
          href="/messages"
          aria-label="Back to conversations"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-surface text-ink-700 hover:bg-ink-100 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M14 6 L8 12 L14 18" />
          </svg>
        </Link>
        <Avatar name={conversation.name} kind={conversation.kind} />
        <div className="min-w-0">
          <h1 className="truncate font-semibold text-ink-900">{conversation.name}</h1>
          <p className="text-xs text-ink-600">
            Private conversation · {conversation.kind === "couple" ? "couple" : "individual"}
          </p>
        </div>
      </div>

      {/* Messages */}
      {demoThread.length === 0 ? (
        <EmptyState
          icon="chat"
          title="Say hello"
          body="This is the very beginning of your conversation — send the first message below."
        />
      ) : (
        <ul className="flex flex-1 flex-col gap-3 py-2" aria-label="Messages">
          {demoThread.map((message) => (
            <li
              key={message.id}
              className={message.sender === "me" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={[
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 sm:max-w-[70%]",
                  message.sender === "me"
                    ? "rounded-br-md bg-brand-700 text-white"
                    : "rounded-bl-md border border-ink-200 bg-surface text-ink-900",
                ].join(" ")}
              >
                {message.body}
                <span
                  aria-hidden
                  className={[
                    "mt-1 block text-[11px]",
                    message.sender === "me" ? "text-white/70" : "text-ink-500",
                  ].join(" ")}
                >
                  {message.at}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Composer (visual until Firebase) */}
      <MessageComposer />
      <p className="text-xs text-ink-500">
        Sample thread for design review — live messaging arrives with Firebase.
      </p>
    </div>
  );
}
