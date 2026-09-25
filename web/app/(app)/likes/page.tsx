import type { Metadata } from "next";
import { requireUser, isRedirectOrNotFoundError } from "@/lib/auth/authorization";
import { PageHeader, PageLock } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/app/Avatar";
import { Icon } from "@/components/landing/Icon";
import { getLikesForUser, type LikeView } from "@/lib/server/likes";
import { ContentSlot } from "@/components/content/ContentSlot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Likes | Couples Corner",
  description: "See who liked your profile.",
};

/**
 * Likes — a grid of (blurred) profile cards for everyone who liked this
 * profile. Blurred placeholder likes (auto-injected by the bot onboarding
 * system 2 days after registration) render blurred with a lock badge.
 * The query fails soft server-side, so this page can never blank-screen.
 */
export default async function LikesPage() {
  let session: Awaited<ReturnType<typeof requireUser>> | null = null;
  try {
    session = await requireUser();
  } catch (error) {
    if (isRedirectOrNotFoundError(error)) throw error;
    return null;
  }

  const likes = await getLikesForUser(session.uid);

  return (
    <PageLock
      className="mx-auto w-full max-w-4xl"
      bodyClassName="flex flex-col gap-8 pb-8"
      head={
        <PageHeader
          eyebrow="Likes"
          title="Who liked you"
        subtitle="Everyone who tapped like on your profile — premium members can see and reply to every like."
        actions={<Button href="/discover" variant="secondary">Discover people</Button>}
        />
      }
    >

      <ContentSlot placement="matches" />

      {likes.length === 0 ? (
        <EmptyState
          icon="heart"
          title="No likes yet"
          body="When someone likes your profile, their card appears here. Keep your photos and bio fresh — profiles with photos get more likes."
          action={<Button href="/discover">Find people</Button>}
        />
      ) : (
        <section aria-label="People who liked you" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {likes.filter((l) => l?.id).map((like) => (
            <LikeCard key={like.id} like={like} />
          ))}
        </section>
      )}
    </PageLock>
  );
}

function LikeCard({ like }: { like: LikeView | null | undefined }) {
  // Strict optional chaining — a malformed like row renders a soft fallback.
  if (!like) return null;
  const name = like.name?.trim() || "Someone special";
  const blurred = Boolean(like.isBlurred);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-4 shadow-card">
      <div className="relative mx-auto h-20 w-20">
        {like.avatarUrl ? (
          <img
            src={like.avatarUrl}
            alt={blurred ? "Hidden profile" : name}
            className={["h-20 w-20 rounded-full object-cover ring-2 ring-brand-500/30", blurred ? "blur-md" : ""].join(" ")}
          />
        ) : (
          <div className={blurred ? "blur-md" : ""}>
            <Avatar name={name} kind={like.kind} size="xl" className="bg-gradient-to-br from-brand-500/25 via-brand-600/10 to-ink-700/40 ring-1 ring-white/10" />
          </div>
        )}
        {blurred ? (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A]/80 text-orange-300">
              <Icon name="lock" className="h-4 w-4" />
            </span>
          </span>
        ) : null}
      </div>

      <div className="text-center">
        <p className={["truncate font-semibold text-white", blurred ? "blur-[6px] select-none" : ""].join(" ")} aria-hidden={blurred || undefined}>
          {blurred ? "Hidden profile" : name}
        </p>
        <p className={["truncate text-xs text-ink-400", blurred ? "blur-[6px] select-none" : ""].join(" ")}>
          {like.location?.trim() || "Location not shared"}
        </p>
      </div>

      {blurred ? (
        <Button size="sm" variant="secondary" href="/subscription" className="w-full">
          Unlock with VIP
        </Button>
      ) : (
        <Button size="sm" variant="secondary" href={`/messages`} className="w-full">
          Say hi
        </Button>
      )}
    </article>
  );
}
