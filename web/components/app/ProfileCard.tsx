import { Avatar } from "@/components/app/Avatar";
import { ConnectionButton } from "@/components/app/ConnectionButton";
import { Chip } from "@/components/ui/Chip";
import type { ProfileCardView } from "@/lib/feature/types";

/**
 * Profile card used in Discover and dashboard suggestions. Consumes the
 * Firestore-ready ProfileCardView; connection actions route through
 * ConnectionButton so Server Actions slot in later without UI changes.
 */
export function ProfileCard({ profile }: { profile: ProfileCardView }) {
  const statusLabel =
    profile.connection === "connected"
      ? "Connected"
      : profile.connection === "outgoing_pending" || profile.connection === "incoming_pending"
        ? "Requested"
        : "New";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-surface p-5 shadow-card transition duration-150 hover:border-ink-300 hover:shadow-lifted">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} kind={profile.kind} size="md" />
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink-900">{profile.name}</h3>
            <p className="truncate text-sm text-ink-600">{profile.location}</p>
          </div>
        </div>
        <Chip tone={profile.connection === "connected" ? "success" : statusLabel === "Requested" ? "brand" : "neutral"}>
          {statusLabel}
        </Chip>
      </div>

      <p className="text-sm leading-6 text-ink-600">{profile.bio}</p>

      <ul className="flex flex-wrap gap-1.5" aria-label="Interests">
        {profile.interests.map((interest) => (
          <li key={interest}>
            <Chip tone="neutral">{interest}</Chip>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {typeof profile.sharedInterests === "number" ? (
          <span className="text-xs font-medium text-brand-700">
            {profile.sharedInterests} shared interest{profile.sharedInterests === 1 ? "" : "s"}
          </span>
        ) : (
          <span />
        )}
        <ConnectionButton state={profile.connection} />
      </div>
    </article>
  );
}
