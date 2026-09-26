import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/authorization";
import { getVisibleProfile } from "@/lib/server/profiles";
import { getProfileStats } from "@/lib/server/profile-stats";
import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/app/Avatar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ProfileConnectionActions } from "@/components/app/ProfileConnectionActions";
import { ReportDialog } from "@/components/app/ReportDialog";
import { BlockDialog } from "@/components/app/BlockDialog";
import { PublicMediaGallery } from "@/components/app/PublicMediaGallery";
import { ProfilePresenceAvatar } from "@/components/app/ProfilePresenceAvatar";
import { getPresenceForUsers } from "@/lib/server/presence";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await getSessionUser();

  // Only the profile owner themselves (or an anonymous viewer of a public
  // profile) may view. getVisibleProfile enforces privacy + blocking server-side.
  const profile = await getVisibleProfile(userId, session?.uid ?? null);
  if (!profile) notFound();

  const isSelf = session?.uid === userId;
  const photo = profile.photos?.[0];

  // Age is DERIVED from date_of_birth, never stored. Computing it here rather
  // than caching means it can never go stale as a member gets older.
  //
  // Guarded rather than assumed: an unparseable or absent date yields null, and
  // a member under 18 or an implausible age renders nothing instead of a
  // nonsensical number.
  const age = (() => {
    if (!profile.dateOfBirth) return null;
    const dob = new Date(profile.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    const beforeBirthday =
      now.getMonth() < dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
    if (beforeBirthday) years -= 1;
    return years >= 18 && years <= 120 ? years : null;
  })();

  // Social stats. Fetched in parallel with presence so the two round trips do
  // not serialise; getProfileStats is fail-soft and returns zeros on error.
  const [presence, stats] = await Promise.all([
    // An empty object on the self view means "no presence to read", but it must
    // still be typed as a lookup map or the index below widens to `any`.
    isSelf
      ? Promise.resolve({} as Record<string, { online: boolean }>)
      : getPresenceForUsers([userId]),
    getProfileStats(userId),
  ]);
  const initialOnline = presence[userId]?.online ?? false;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Profile"
        title={profile.displayName}
        subtitle={profile.bio || "This space is quiet for now."}
      />

      {/* Public ID + compact social stats. The ID is the member's permanent
          handle, so it belongs at the top where a visitor can read it off. */}
      <div className="-mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {profile.userCode ? (
          <p className="rounded-full border border-white/10 bg-surface px-2.5 py-1 font-mono text-xs tracking-[0.18em] text-ink-300">
            {profile.userCode}
          </p>
        ) : null}
        <dl className="flex items-center gap-4 text-sm">
          {[
            { label: "Following", value: stats.following },
            { label: "Followers", value: stats.followers },
            { label: "Friends", value: stats.friends },
            { label: "Visitors", value: stats.visitors },
          ].map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <dt className="order-2 text-ink-400">{stat.label}</dt>
              <dd className="order-1 font-semibold tabular-nums text-white">
                {stat.value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Identity */}
        <Card className="flex flex-col items-center gap-4 text-center">
          <ProfilePresenceAvatar
            userId={userId}
            name={profile.displayName}
            storagePath={photo?.storagePath ?? null}
            initialOnline={initialOnline}
          />
          {/* Name + age. Age is omitted entirely when unknown rather than
              rendered as a placeholder, so the line never reads "Name, 0". */}
          <h2 className="text-lg font-semibold text-white">
            {profile.displayName}
            {age !== null ? (
              <span className="ml-2 text-base font-normal text-ink-400">{age}</span>
            ) : null}
          </h2>
          {profile.occupation ? (
            <p className="text-sm text-ink-300">{profile.occupation}</p>
          ) : null}
          {profile.profileType === "coupled" ? <Chip tone="brand">Couple</Chip> : null}
          {profile.location ? <p className="text-sm text-ink-300">{profile.location}</p> : null}
        </Card>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <Card as="section" className="flex flex-col gap-3" aria-label="About">
            <h2 className="font-semibold text-white">About</h2>
            {profile.bio ? (
              <p className="text-sm leading-6 text-ink-200">{profile.bio}</p>
            ) : (
              <p className="text-sm text-ink-400">
                {isSelf ? "Add a bio so people can get to know you." : "No bio shared yet."}
              </p>
            )}
          </Card>

          <Card as="section" className="flex flex-col gap-3" aria-label="Interests">
            <h2 className="font-semibold text-white">Interests</h2>
            {profile.interests && profile.interests.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <li key={interest}><Chip tone="neutral">{interest}</Chip></li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-400">No interests shared yet.</p>
            )}
          </Card>

          {/* Uploaded photos & videos — same gallery used on the own-profile page. */}
          <section id="media" aria-label="Photos and videos">
            <PublicMediaGallery uid={userId} />
          </section>

          {/* Relationship type & further profile details */}
          {profile.profileType ||
          profile.relationshipStatus ||
          profile.lookingFor ||
          profile.gender ||
          profile.orientation ||
          profile.country ? (
            <Card as="section" className="flex flex-col gap-3" aria-label="Relationship">
              <h2 className="font-semibold text-white">Relationship</h2>
              {profile.relationshipStatus ? (
                <p className="text-sm text-ink-200">
                  Status: {profile.relationshipStatus.charAt(0).toUpperCase() + profile.relationshipStatus.slice(1)}
                </p>
              ) : null}
              {profile.profileType ? (
                <p className="text-sm text-ink-200">
                  Profile: {profile.profileType.charAt(0).toUpperCase() + profile.profileType.slice(1)}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {profile.lookingFor ? (
                  <Chip tone="neutral">Looking for: {profile.lookingFor}</Chip>
                ) : null}
                {profile.gender ? <Chip tone="neutral">{profile.gender}</Chip> : null}
                {profile.orientation ? (
                  <Chip tone="neutral">{profile.orientation}</Chip>
                ) : null}
                {profile.country ? <Chip tone="neutral">{profile.country}</Chip> : null}
              </div>
            </Card>
          ) : null}

          {/* Actions */}
          {!isSelf && (
            <div className="flex flex-wrap items-center gap-2">
              <ProfileConnectionActions
                targetUserId={userId}
                viewerUid={session?.uid ?? null}
                size="md"
              />
              <ReportDialog
                targetLabel={profile.displayName}
                entityType="user"
                entityId={userId}
              />
              <BlockDialog targetLabel={profile.displayName} targetUid={userId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}