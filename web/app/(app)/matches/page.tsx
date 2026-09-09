import { requireUser } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { Avatar } from "@/components/app/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IncomingRequestActions } from "@/components/app/IncomingRequestActions";
import { OutgoingRequestRow } from "./OutgoingRequestRow";
import { getMatchesData } from "@/lib/server/discovery";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await requireUser();

  try {
    const overview = await getMatchesData(session.uid);

    return (
      <div className="flex flex-col gap-10">
        <PageHeader
          eyebrow="Connections"
          title="Matches"
          subtitle="Requests you've received, requests you've sent, and people you're connected with."
        />

        {/* Incoming requests */}
        <section aria-labelledby="incoming-heading" className="flex flex-col gap-4">
          <h2 id="incoming-heading" className="font-semibold text-ink-900">
            Incoming requests <span className="text-ink-500">({overview.incoming.length})</span>
          </h2>
          {overview.incoming.length === 0 ? (
            <EmptyState
              icon="couple"
              title="No incoming requests"
              body="When someone sends you a connection request, it appears here for you to accept or decline."
            />
          ) : (
            <Card padding="none" className="divide-y divide-ink-200">
              {overview.incoming.map((request) => (
                <div key={request.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <Avatar name={request.name} kind={request.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{request.name}</p>
                    <p className="truncate text-sm text-ink-600">{request.location}</p>
                  </div>
                  <IncomingRequestActions requestId={request.id} />
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* Outgoing (sent) requests */}
        <section aria-labelledby="outgoing-heading" className="flex flex-col gap-4">
          <h2 id="outgoing-heading" className="font-semibold text-ink-900">
            Sent requests <span className="text-ink-500">({overview.outgoing.length})</span>
          </h2>
          {overview.outgoing.length === 0 ? (
            <EmptyState
              icon="discover"
              title="No sent requests"
              body="Requests you send to others will be listed here until they're answered."
            />
          ) : (
            <Card padding="none" className="divide-y divide-ink-200">
              {overview.outgoing.map((request) => (
                <OutgoingRequestRow key={request.id} person={request} />
              ))}
            </Card>
          )}
        </section>

        {/* Accepted connections */}
        <section aria-labelledby="connected-heading" className="flex flex-col gap-4">
          <h2 id="connected-heading" className="font-semibold text-ink-900">
            Connected <span className="text-ink-500">({overview.connected.length})</span>
          </h2>
          {overview.connected.length === 0 ? (
            <EmptyState
              icon="couple"
              title="No connections yet"
              body="Connections you accept will live here, with messaging unlocked for each one."
              action={<Button href="/discover">Find people</Button>}
            />
          ) : (
            <Card padding="none" className="divide-y divide-ink-200">
              {overview.connected.map((connection) => (
                <div key={connection.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <Avatar name={connection.name} kind={connection.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{connection.name}</p>
                    <p className="truncate text-sm text-ink-600">{connection.location}</p>
                  </div>
                  <Button size="sm" variant="secondary" href="/messages">Message</Button>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    );
  } catch {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow="Connections" title="Matches" />
        <ErrorState
          title="Couldn't load your matches"
          body="Something went wrong reaching your connections. Please try again."
        />
      </div>
    );
  }
}

