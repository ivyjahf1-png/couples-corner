import { UserMediaGallery } from "@/components/app/UserMediaGallery";

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

  // Completion ring geometry (SVG donut, brand-orange progress on navy).
  const pct = Math.min(Math.max(completion?.percentage ?? 0, 0), 100);
  const ringRadius = 60;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = (pct / 100) * ringCircumference;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Your profile"
        title="Profile overview"
        subtitle="This is what potential connections see. Keep it warm, honest, and current."
        actions={<Button href="/profile/edit" variant="secondary">Edit profile</Button>}
      />

      {/* Shortcut row: Settings · Edit Profile · Add Media */}
      <div className="flex flex-wrap gap-3">
        <Button href="/settings" variant="secondary" size="sm">Settings</Button>
        <Button href="/profile/edit" variant="secondary" size="sm">Edit profile</Button>
        <Button href="/profile#media" variant="secondary" size="sm">Add media</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Identity */}
        <Card className="flex flex-col items-center gap-4 text-center">
          {photo ? (
            <img
              src={`/api/photos/${session.uid}/${photo?.storagePath?.split("/")?.pop() ?? ""}`}
              alt={profile?.displayName ?? "Profile photo"}
              className="h-28 w-28 rounded-full object-cover ring-2 ring-brand-500/40"
            />
          ) : (
            <Avatar name={profile?.displayName || "User"} size="xl" />
          )}
          <div>
            <h2 className="text-lg font-semibold text-white">
              {profile?.displayName || user?.displayName || "Your name"}
            </h2>
            <p className="text-sm text-ink-300">{session.email}</p>
          </div>
          <Chip tone="success" leadingDot>Email verified</Chip>
          {profile?.location ? <p className="text-sm text-ink-300">{profile.location}</p> : null}
          <p className="text-xs text-ink-400">
            Visibility: {visibilityLabel} · {completion.percentage}% complete
          </p>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Completion ring */}
          <Card as="section" className="flex flex-col gap-4" aria-label="Profile completion ring">
            <h2 className="font-semibold text-white">Profile completion</h2>
            <div className="flex items-center gap-5">
              <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0" role="img" aria-label={`Profile ${pct}% complete`}>
                <circle cx="70" cy="70" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle
                  cx="70" cy="70" r={ringRadius} fill="none"
                  stroke="url(#completionGradient)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${ringDash} ${ringCircumference - ringDash}`}
                  transform="rotate(-90 70 70)"
                />
                <defs>
                  <linearGradient id="completionGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FB923C" />
                    <stop offset="100%" stopColor="#FF5722" />
                  </linearGradient>
                </defs>
                <text x="70" y="74" textAnchor="middle" className="fill-white text-xl font-bold">{pct}%</text>
              </svg>
              <div className="flex flex-col gap-2">
                {completion.missing.length > 0 ? (
                  <p className="text-sm text-ink-300">Add: {completion.missing.join(", ")}</p>
                ) : (
                  <p className="text-sm text-success-300">Your profile is complete. Nice work!</p>
                )}
                <Button size="sm" variant="secondary" href="/profile/edit">
                  {completion.percentage < 100 ? "Continue setup" : "Edit details"}
                </Button>
              </div>
            </div>
          </Card>

          <div id="media">
            <UserMediaGallery uid={session.uid} />
          </div>
          {/* About */}
          <Card as="section" className="flex flex-col gap-3" aria-label="About">
            <h2 className="font-semibold text-white">About</h2>
            {profile?.bio ? (
              <p className="text-sm leading-6 text-ink-200">{profile.bio}</p>
            ) : (
              <p className="text-sm text-ink-400">
                Add a bio so people can learn about you in Discover.
              </p>
            )}
          </Card>

          {/* Interests */}
          <Card as="section" className="flex flex-col gap-3" aria-label="Interests">
            <h2 className="font-semibold text-white">Interests</h2>
            {profile?.interests && profile.interests.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <li key={interest}><Chip tone="neutral">{interest}</Chip></li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-400">
                Add interests to improve your Discover suggestions.
              </p>
            )}
          </Card>

          {/* Couple information */}
          <Card as="section" className="flex flex-col gap-3" aria-label="Couple information">
            <h2 className="font-semibold text-white">Couple profile</h2>
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