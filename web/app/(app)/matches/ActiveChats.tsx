import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isRedirectOrNotFoundError } from "@/lib/auth/authorization";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { getMatchChats } from "@/lib/server/match-chats";

/** Kept separate so a chat query failure does not hide connection requests. */
export async function ActiveChats({ uid }: { uid: string }) {
  try {
    const chats = await getMatchChats(uid);
    return (
      <section aria-labelledby="chats-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="chats-heading" className="font-semibold text-white">
            Active chats <span className="text-ink-400">({chats.length})</span>
          </h2>
          <Button size="sm" variant="secondary" href="/messages">Open inbox</Button>
        </div>
        {chats.length === 0 ? (
          <EmptyState
            icon="chat"
            title="No chats yet"
            body="Your conversations will appear here once you start chatting with a connection."
            action={<Button href="/discover">Discover people</Button>}
          />
        ) : (
          <Card padding="none" className="divide-y divide-ink-700 overflow-hidden">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/messages/${chat.id}`}
                className="flex items-center gap-3 px-5 py-4 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400"
              >
                <Avatar name={chat.name} kind={chat.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{chat.name}</p>
                  <p className="text-sm text-ink-300">
                    {chat.lastMessageAt ? (
                      <>Last message <time dateTime={chat.lastMessageAt}>{new Date(chat.lastMessageAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></>
                    ) : "No messages yet — say hello"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-brand-300">Open chat</span>
              </Link>
            ))}
          </Card>
        )}
      </section>
    );
  } catch (error) {
    if (isRedirectOrNotFoundError(error)) throw error;
    // Surface the underlying cause in the server logs so failures like
    // PostgREST errors from match-chats are inspectable, not silent.
    // supabaseErrorDetail captures code/details/hint (e.g. PGRST205 = missing
    // table, 42501 = RLS denial) so the exact DB exception is diagnosable.
    console.error("[matches] Active chats load failed", {
      uid,
      ...supabaseErrorDetail(error),
    });
    return (
      <section aria-labelledby="chats-heading" className="flex flex-col gap-4">
        <h2 id="chats-heading" className="font-semibold text-white">Active chats</h2>
        <ErrorState
          title="Couldn't load your chats"
          body="Your conversations are temporarily unavailable. Please try again."
          action={<Button href="/matches" variant="secondary">Try again</Button>}
        />
      </section>
    );
  }
}
