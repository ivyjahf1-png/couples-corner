import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfile } from "@/lib/server/profiles";
import { computeProfileCompletion } from "@/lib/utils/profile-completion";
import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/app/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/app/EmptyState";
import { VISIBILITY_OPTIONS } from "@/lib/models";

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) return null; // requireUser() at the layout level already redirects.

  const { user, profile } = await getOwnProfile(session.uid);
  const completion = computeProfileCompletion(profile);

  const photo = profile?.photos?.[0];
  const visibilityLabel =
    VISIBILITY_OPTIONS.find((o) => o.value === profile?.visibility)?.label ?? "Private";
  const couple = null; // couple profiles are managed separately.

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Your profile"
        title="Profile overview"
        subtitle="This is what potential connections see. Keep it warm, honest, and current."
        actions={<Button href="/profile/edit" variant="secondary">Edit profile</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Identity */}
        <Card className="flex flex-col items-center gap-4 text-center">
          {photo ? (
            <img
              src={`/api/photos/${session.uid}/${photo.storagePath.split("/").pop()}`}
              alt={profile?.displayName ?? "Profile photo"}
              className="h-28 w-28 rounded-full object-cover ring-2 ring-brand-200"
            />
          ) : (
            <Avatar name={profile?.displayName || "User"} size="xl" />
          )}
          <div>
            <h2 className="text-lg font-semibold text-ink-900">
              {profile?.displayName || user?.displayName || "Your name"}
            </h2>
            <p className="text-sm text-ink-600">{session.email}</p>
          </div>
          <Chip tone="success" leadingDot>Email verified</Chip>
          {profile?.location ? <p className="text-sm text-ink-600">{profile.location}</p> : null}
          <p className="text-xs text-ink-500">
            Visibility: {visibilityLabel} · {completion.percentage}% complete
          </p>
        </Card>

        <div className="flex flex-col gap-6">
          {/* About */}
          <Card as="section" className="flex flex-col gap-3" aria-label="About">
            <h2 className="font-semibold text-ink-900">About</h2>
            {profile?.bio ? (
              <p className="text-sm leading-6 text-ink-700">{profile.bio}</p>
            ) : (
              <p className="text-sm text-ink-500">
                Add a bio so people can learn about you in Discover.
              </p>
            )}
          </Card>

          {/* Interests */}
          <Card as="section" className="flex flex-col gap-3" aria-label="Interests">
            <h2 className="font-semibold text-ink-900">Interests</h2>
            {profile?.interests && profile.interests.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <li key={interest}><Chip tone="neutral">{interest}</Chip></li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">
                Add interests to improve your Discover suggestions.
              </p>
            )}
          </Card>

          {/* Completion */}
          <Card as="section" className="flex flex-col gap-3" aria-label="Profile completion">
            <h2 className="font-semibold text-ink-900">Profile completion</h2>
            <div
              role="progressbar"
              aria-valuenow={completion.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completion"
              className="h-2 overflow-hidden rounded-full bg-ink-100"
            >
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            {completion.missing.length > 0 ? (
              <p className="text-sm text-ink-600">
                Add: {completion.missing.join(", ")}
              </p>
            ) : (
              <p className="text-sm text-success-700">Your profile is complete. Nice work!</p>
            )}
            <Button size="sm" variant="secondary" href="/profile/edit">
              {completion.percentage < 100 ? "Continue setup" : "Edit details"}
            </Button>
          </Card>

          {/* Couple information */}
          <Card as="section" className="flex flex-col gap-3" aria-label="Couple information">
            <h2 className="font-semibold text-ink-900">Couple profile</h2>
            {couple ? null : (
              <EmptyState
                icon="couple"
                title="No couple profile yet"
                body="Create a shared couple profile to tell your story together — you can link a partner and customise it later."
                action={<Button size="sm" variant="ghost" href="/profile/edit">Setup couple profile</Button>}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}