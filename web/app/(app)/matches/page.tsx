import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser, isRedirectOrNotFoundError } from "@/lib/auth/authorization";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { SkeletonList } from "@/components/app/Skeleton";
import { ActiveChats } from "./ActiveChats";
import { PageHeader, PageLock } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { Avatar } from "@/components/app/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IncomingRequestActions } from "@/components/app/IncomingRequestActions";
import { OutgoingRequestRow } from "./OutgoingRequestRow";
import { getMatchesData } from "@/lib/server/discovery";
import { ContentSlot } from "@/components/content/ContentSlot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Matches | Couples Corner",
  description: "Manage your connections, match requests, and private chats.",
};

/** The (app) route group preserves the public URL /matches and its auth guard. */
export default async function MatchesPage() {
  const session = await requireUser();

  return (
    <PageLock
      className="mx-auto w-full max-w-4xl"
      bodyClassName="flex flex-col gap-10 pb-8"
      head={
        <PageHeader
          eyebrow="Connections"
          title="Matches"
          subtitle="Your connections, match requests, and active chats — all in one place."
          actions={<Button href="/messages" variant="secondary">View messages</Button>}
        />
      }
    >
      <Suspense fallback={<SkeletonList rows={2} />}>
        <ActiveChats uid={session.uid} />
      </Suspense>
      <Suspense fallback={<SkeletonList rows={3} />}>
        <MatchConnections uid={session.uid} />
      </Suspense>
      <Suspense fallback={null}>
        <ContentSlot placement="matches" />
      </Suspense>
    </PageLock>
  );
}

async function MatchConnections({ uid }: { uid: string }) {
  try {
    const overview = await getMatchesData(uid);

    return (
      <div className="flex flex-col gap-10">
        {/* Incoming requests */}
        <section aria-labelledby="incoming-heading" className="flex flex-col gap-4">
          <h2 id="incoming-heading" className="font-semibold text-white">
            Incoming requests <span className="text-ink-400">({overview.incoming.length})</span>
          </h2>
          {overview.incoming.length === 0 ? (
            <EmptyState
              icon="couple"
              title="No incoming requests"
              body="When someone sends you a connection request, it appears here for you to accept or decline."
            />
          ) : (
            <Card padding="none" className="divide-y divide-ink-700">
              {overview.incoming.map((request) => (
                <div key={request.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <Avatar name={request.name} kind={request.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{request.name}</p>
                    <p className="truncate text-sm text-ink-300">{request.location}</p>
                  </div>
                  <IncomingRequestActions requestId={request.id} />
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* Outgoing (sent) requests */}
        <section aria-labelledby="outgoing-heading" className="flex flex-col gap-4">
          <h2 id="outgoing-heading" className="font-semibold text-white">
            Sent requests <span className="text-ink-400">({overview.outgoing.length})</span>
          </h2>
          {overview.outgoing.length === 0 ? (
            <EmptyState
              icon="discover"
              title="No sent requests"
              body="Requests you send to others will be listed here until they're answered."
            />
          ) : (
            <Card padding="none" className="divide-y divide-ink-700">
              {overview.outgoing.map((request) => (
                <OutgoingRequestRow key={request.id} person={request} />
              ))}
            </Card>
          )}
        </section>

        {/* Accepted connections */}
        <section aria-labelledby="connected-heading" className="flex flex-col gap-4">
          <h2 id="connected-heading" className="font-semibold text-white">
            Connected <span className="text-ink-400">({overview.connected.length})</span>
          </h2>
          {overview.connected.length === 0 ? (
            <EmptyState
              icon="couple"
              title="No connections yet"
              body="Connections you accept will live here, with messaging unlocked for each one."
              action={<Button href="/discover">Find people</Button>}
            />
          ) : (
            <Card padding="none" className="divide-y divide-ink-700">
              {overview.connected.map((connection) => (
                <div key={connection.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <Avatar name={connection.name} kind={connection.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{connection.name}</p>
                    <p className="truncate text-sm text-ink-300">{connection.location}</p>
                  </div>
                  <Button size="sm" variant="secondary" href="/messages">Message</Button>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    );
  } catch (error) {
    if (isRedirectOrNotFoundError(error)) throw error;
    console.error("[matches] Connections/requests load failed", {
      uid,
      ...supabaseErrorDetail(error),
    });
    return (
      <ErrorState
        title="Couldn't load your matches"
        body="Something went wrong reaching your connections. Please try again."
        action={<Button href="/matches" variant="secondary">Try again</Button>}
      />
    );
  }
}

