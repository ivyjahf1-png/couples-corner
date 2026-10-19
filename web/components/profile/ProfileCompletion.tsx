import { useEffect, useState } from "react";

/** useMounted — tracks whether the component has finished mounting so that
 *  client-only state updates never run during the initial (server-hydrated)
 *  render pass. Keeping server and client first-paint identical is what stops
 *  React Error #441 from being thrown in the profile flow. */

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

/** ProfileCompletion — the "Me" profile's completion surface.
 *
 * WARN mode: dateOfBirth, location and bio are *client dynamic fields* — they
 * are resolved after the component mounts (cloud fetch / user edit). If they
 * were placed directly in the JSX, the server would first print the blank
 * placeholder and the client would print the real value on the mount effect,
 * so the two renderings would disagree and React 19's hydration pass would
 * abort with a content-mismatch error (#441).
 *
 * The mount guard pins both renditions to the same placeholder until the
 * client has finished mounting, after which the fields settle to their real
 * values without ever touching the SSR tree. */

export interface ProfileCompletionProps {
  /** yyyy-mm-dd server digest for birthday output, null when unset */
  dateOfBirth: string | null;
  /** display label, e.g. "Lagos, NG" or "Nairobi, KE" */
  location: string | null;
  /** short bio string, trimmed; "" when absent */
  bio: string;
  /** upgrade read-only flag to gate the "Complete" CTA text */
  isCompleted?: boolean;
}

export function ProfileCompletion({
  dateOfBirth,
  location,
  bio,
  isCompleted = false,
}: ProfileCompletionProps) {
  const mounted = useMounted();

  // Client-only dynamic fields — resolved after mount so the initial render
  // (identical on server and client) can never diverge and throw Error #441.
  const [displayBirthday, setDisplayBirthday] = useState<string | null>(null);
  const [displayLocation, setDisplayLocation] = useState<string | null>(null);
  const [displayBio, setDisplayBio] = useState<string>("");

  useEffect(() => {
    setDisplayBirthday(dateOfBirth ?? null);
    setDisplayLocation(location ?? null);
    setDisplayBio(bio ?? "");
  }, [dateOfBirth, location, bio]);

  const formatBirthday = (raw: string | null): string => {
    if (!raw) return "—";
    const d = new Date(raw + (raw.length === 10 ? "T00:00:00" : ""));
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <section
      aria-label="Profile completion"
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-black text-orange-300">
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> ✓
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" /> ∅
            </>
          )}
        </span>
        <h2 className="text-sm font-bold text-white">
          {isCompleted ? "Profile complete" : "Complete your profile"}
        </h2>
      </div>

      {/* dateOfBirth — mount-guarded */}
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
        <span className="text-xs font-medium text-ink-400">Date of birth</span>
        <span className="truncate text-sm font-medium text-white">
          {mounted ? displayBirthday ?? "—" : "—"}
        </span>
      </div>

      {/* location — mount-guarded */}
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
        <span className="text-xs font-medium text-ink-400">Location</span>
        <span className="truncate text-sm font-medium text-white">
          {mounted ? displayLocation ?? "—" : "—"}
        </span>
      </div>

      {/* bio — mount-guarded */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
        <span className="text-xs font-medium text-ink-400">Bio</span>
        <p className="mt-1 text-sm text-white/90">
          {mounted ? displayBio ?? "—" : "—"}
        </p>
      </div>

      {!isCompleted && (
        <a
          href="/profile/edit"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-orange-400/30 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/10"
        >
          <Pen className="h-4 w-4" aria-hidden />
          Finish setup
        </a>
      )}
    </section>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function Pen({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
