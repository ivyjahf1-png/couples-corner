import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/authorization";
import { getVisibleProfile } from "@/lib/server/profiles";
import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/app/Avatar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ProfileConnectionActions } from "@/components/app/ProfileConnectionActions";
import { ReportDialog } from "@/components/app/ReportDialog";
import { BlockDialog } from "@/components/app/BlockDialog";
import { PublicMediaGallery } from "@/components/app/PublicMediaGallery";

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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Profile"
        title={profile.displayName}
        subtitle={profile.bio || "This space is quiet for now."}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Identity */}
        <Card className="flex flex-col items-center gap-4 text-center">
          {photo ? (
            <img
              src={`/api/photos/${userId}/${photo.storagePath.split("/").pop()}`}
              alt={profile.displayName}
              className="h-28 w-28 rounded-full object-cover ring-2 ring-brand-500/40"
            />
          ) : (
            <Avatar name={profile.displayName} size="xl" />
          )}
          <h2 className="text-lg font-semibold text-white">{profile.displayName}</h2>
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

          {/* Relationship type */}
          {profile.profileType || profile.relationshipStatus ? (
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