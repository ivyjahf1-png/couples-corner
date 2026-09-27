import type { Metadata } from "next";
import { requireUser, isRedirectOrNotFoundError } from "@/lib/auth/authorization";
import { PageHeader, PageLock } from "@/components/app/PageHeader";
import { ErrorState } from "@/components/app/ErrorState";
import { Button } from "@/components/ui/Button";
import { getLikesForUser, getPostLikesForUser } from "@/lib/server/likes";
import { LikesTabs } from "@/components/app/LikesTabs";
import { ContentSlot } from "@/components/content/ContentSlot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Likes | Couples Corner",
  description: "See who liked your profile and your posts.",
};

/**
 * Likes — two surfaces, split into tabs by <LikesTabs>:
 *
 * - Profile likes: a grid of (blurred) profile cards for everyone who liked
 *   THIS profile. Blurred placeholder likes (auto-injected by the bot onboarding
 *   system 2 days after registration) render blurred with a lock badge.
 * - Post likes: who reacted to each of this member's own moments.
 *
 * This page stays a Server Component: it does the data access and hands the
 * client tabs plain serialisable view models, so the tab switch needs no
 * round-trip. It also means the `server-only` boundary in lib/server/likes.ts is
 * never crossed by the client component.
 *
 * The old `return null` on a session failure rendered a BLANK page with no
 * explanation, which reads as a crash; it now renders a real error state.
 */
export default async function LikesPage() {
  let session: Awaited<ReturnType<typeof requireUser>> | null = null;
  try {
    session = await requireUser();
  } catch (error) {
    if (isRedirectOrNotFoundError(error)) throw error;
    return (
      <ErrorState
        title="We couldn't load your likes"
        body="Something went wrong on our side. Try again in a moment."
      />
    );
  }

  // Independent queries, so they run concurrently rather than in series.
  const [profileLikes, postLikes] = await Promise.all([
    getLikesForUser(session.uid),
    getPostLikesForUser(session.uid),
  ]);

  return (
    <PageLock
      className="mx-auto w-full max-w-4xl"
      bodyClassName="flex flex-col gap-8 pb-8"
      head={
        <PageHeader
          eyebrow="Likes"
          title="Who liked you"
          subtitle="Everyone who tapped like on your profile or your posts — premium members can see and reply to every like."
          actions={<Button href="/discover" variant="secondary">Discover people</Button>}
        />
      }
    >
      <ContentSlot placement="matches" />

      <LikesTabs profileLikes={profileLikes} postLikes={postLikes} />
    </PageLock>
  );
}
