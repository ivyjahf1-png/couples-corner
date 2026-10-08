"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { sendConnectionAction } from "@/lib/actions/connections";

import { Avatar } from "@/components/app/Avatar";
import { profileViewClick } from "@/components/profile/ProfileViewModal";
import { ConnectionButton } from "@/components/app/ConnectionButton";
import { Chip } from "@/components/ui/Chip";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";
import type { ProfileCardView } from "@/lib/feature/types";
import { countryFlag } from "@/lib/utils/country-flag";

/**
 * Profile card used in Discover and dashboard suggestions. Consumes the
 * Firestore-ready ProfileCardView; connection actions route through
 * ConnectionButton so Server Actions slot in later without UI changes.
 *
 * Storage-backed photos are served via `/api/photos/{uid}/{fileName}`;
 * `avatarUrl` carries that URL (see lib/server/discovery.ts).
 *
 * Every action guards on the profile id: the id is the database key for the
 * connection request, so a card without one can never mutate anything — the
 * Connect button renders disabled instead of throwing
 * "Cannot read properties of null (reading 'id')".
 */
export function ProfileCard({ profile }: { profile: ProfileCardView | null | undefined }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [error, reportError] = useActionError();

  // Guard: profile object itself may be null/undefined at runtime (e.g. a
  // stale list entry) — render nothing rather than crashing on `.id`.
  if (!profile) return null;

  const connection = sent ? "outgoing_pending" : profile.connection;

  // Full profile destination — discovery profiles carry an explicit href;
  // anything else falls back to the canonical /profile/{id} route.
  const profileHref = profile.href?.trim() || `/profile/${encodeURIComponent(profile?.id ?? "")}`;

  // Guard: no valid target id → nothing to connect to. Render read-only.
  const hasTargetId = typeof profile?.id === "string" && (profile?.id ?? "").trim().length > 0;
  const name = profile?.name?.trim() || "Community member";
  const flag = countryFlag(profile.country);
  /* 0, negative, non-integer or absent overlap → null → no ring. The ring must
     never render a number the server did not actually compute. */
  const matchPercent =
    typeof profile.matchPercent === "number" &&
    profile.matchPercent > 0 &&
    profile.matchPercent <= 100
      ? Math.round(profile.matchPercent)
      : null;

  async function connect() {
    const targetId = profile?.id?.trim();
    if (!targetId || !hasTargetId || busy || connection !== "none") return;
    setBusy(true);
    reportError(null);
    try {
      const result = await sendConnectionAction(targetId);
      if (!result.ok) {
        reportError(failureMessage(result.error || "Couldn't send your request. Please try again.", result.error || "Couldn't send your request. Check your connection and try again."));
        return;
      }
      setSent(true);
      router.refresh();
    } catch (err) {
      reportError(failureMessage(err, "Couldn't send your request. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    connection === "connected"
      ? "Connected"
      : connection === "outgoing_pending" || connection === "incoming_pending"
        ? "Requested"
        : "New";

  return (
    <Link
      href={profileHref as never}
      aria-label={`View ${name}'s full profile`}
      /* TAP THE CARD → GLOBAL PROFILE MODAL, in place, instead of navigating
         away from the Explore grid. `profileViewClick` intercepts plain
         left-clicks only: ctrl/cmd/shift-click, middle-click and "copy link"
         still follow `href` (open in new tab, save), and with JavaScript off the
         anchor navigates exactly as before. The connection buttons below stop
         propagation, so they keep acting on the card rather than opening the
         profile. The fallback id guard mirrors `hasTargetId`: no id → plain
         navigation, never a modal with nothing to fetch. */
      onClick={profileViewClick(hasTargetId ? profile.id : null)}
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-5 shadow-card transition duration-150 hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {profile.avatarUrl && failedPhoto !== profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={name}
              onError={() => setFailedPhoto(profile.avatarUrl ?? null)}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <Avatar name={name} kind={profile.kind} size="md" className="bg-gradient-to-br from-brand-500/25 via-brand-600/10 to-ink-700/40 ring-1 ring-white/10" />
          )}
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-white">{name}</h3>
            {/* Age/country badge — "28 🇳🇬". Both halves are optional: no DOB or
                no mapped country renders whichever exists, and neither renders
                the row at all rather than a placeholder value. */}
            {profile.age != null || flag ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white">
                {profile.age != null ? <span>{profile.age}</span> : null}
                {flag ? <span>{flag}</span> : null}
              </span>
            ) : null}
            <p className="truncate text-sm text-ink-300">{profile.location?.trim() || "Location not shared"}</p>
          </div>
        </div>
        <Chip tone={profile.connection === "connected" ? "success" : statusLabel === "Requested" ? "brand" : "neutral"}>
          {statusLabel}
        </Chip>
      </div>

      {/* Bio + match ring. The ring sits beside the bio/interest tags and only
          exists when the server computed a real overlap — see MatchRing below. */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {profile.bio?.trim() ? (
            <p className="text-sm leading-6 text-ink-300">{profile.bio.trim()}</p>
          ) : (
            <p className="text-sm italic leading-6 text-ink-400">
              A quiet presence — this member is keeping their story unwritten for now.
            </p>
          )}
        </div>
        {matchPercent !== null ? <MatchRing percent={matchPercent} /> : null}
      </div>

      {profile.interests.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Interests">
          {profile.interests.map((interest) => (
            <li key={interest}>
              <Chip tone="neutral">{interest}</Chip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs uppercase tracking-wide text-ink-400">Intentional Member · Interests to be revealed</p>
      )}

      {/* Action row — clicks stay on the buttons (stopPropagation) so the
          card-level Link doesn't navigate underneath them. */}
      <div
        className="mt-auto flex items-center justify-between gap-2 pt-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {typeof profile.sharedInterests === "number" && profile.sharedInterests > 0 ? (
          <span className="text-xs font-medium text-brand-300">
            {profile.sharedInterests} shared interest{profile.sharedInterests === 1 ? "" : "s"}
          </span>
        ) : (
          <span />
        )}
        {!hasTargetId ? (
          <span className="text-sm font-medium text-orange-300">View profile →</span>
        ) : connection === "none" ? (
          busy ? (
            <Button size="sm" disabled>Sending…</Button>
          ) : (
            <ConnectionButton state={connection} onConnect={connect} />
          )
        ) : connection === "self" ? (
          <Button size="sm" href="/profile">Your profile</Button>
        ) : (
          <Button size="sm" variant="secondary" href="/matches">
            {connection === "incoming_pending" ? "Review request" : connection === "connected" ? "View connection" : "Request sent"}
          </Button>
        )}
      </div>
      {error ? <p role="alert" className="text-sm text-danger-300">{error}</p> : null}
    </Link>
  );
}

/* ── MATCH RING ───────────────────────────────────────────────────────────────
   A glowing orange progress ring for ProfileCardView.matchPercent — the REAL
   shared-interest overlap (shared ÷ their listed interests) computed in
   lib/server/discovery.ts, not a fabricated compatibility score. When the
   server has no genuine overlap the field is undefined, `matchPercent` above
   resolves to null, and no ring renders at all — the same "omit rather than
   invent a number" rule the conversation summary cards follow.

   The glow is an inline drop-shadow (not a Tailwind class) so it works
   regardless of the purge/content config, matching the Moment follow-ring
   treatment. The ring is decorative: the accessible label carries the value. */
const RING_RADIUS = 21;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function MatchRing({ percent }: { percent: number }) {
  const offset = RING_CIRCUMFERENCE * (1 - percent / 100);
  return (
    <div
      role="img"
      aria-label={`${percent}% interest match`}
      className="flex shrink-0 flex-col items-center"
    >
      <svg
        width="54"
        height="54"
        viewBox="0 0 54 54"
        style={{ filter: "drop-shadow(0 0 6px rgba(249, 115, 22, 0.65))" }}
      >
        {/* Track */}
        <circle cx="27" cy="27" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        {/* Progress arc, drawn clockwise from 12 o'clock */}
        <circle
          cx="27"
          cy="27"
          r={RING_RADIUS}
          fill="none"
          stroke="#F97316"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 27 27)"
        />
        <text
          x="27"
          y="27"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-[11px] font-bold"
        >
          {percent}%
        </text>
      </svg>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-300">
        Match
      </span>
    </div>
  );
}
