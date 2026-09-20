import { PageHeader } from "@/components/app/PageHeader";
import { ProfileCard } from "@/components/app/ProfileCard";
import { Avatar } from "@/components/app/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { ContentSlot } from "@/components/content/ContentSlot";
import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfile } from "@/lib/server/profiles";
import { getMembership } from "@/lib/server/subscription";
import { WalletMenu } from "@/components/app/WalletMenu";
import { emptyWallet, type WalletView } from "@/lib/models/wallet";
import { getDiscoverProfiles } from "@/lib/server/discovery";
import { computeProfileCompletion } from "@/lib/utils/profile-completion";
import { demoActivity, demoNotifications, demoProfileViews } from "@/lib/demo/demo-data";

export const dynamic = "force-dynamic";

const quickActions = [
  { href: "/discover", icon: "discover" as const, label: "Discover people & couples" },
  { href: "/profile", icon: "profile" as const, label: "Complete your profile" },
  { href: "/messages", icon: "chat" as const, label: "Open messages" },
];

function photoSrc(uid: string, storagePath?: string | null): string | null {
  if (!storagePath) return null;
  const fileName = storagePath.split("/").pop();
  if (!fileName) return null;
  return `/api/photos/${uid}/${fileName}`;
}

export default async function DashboardPage() {
  const session = await getSessionUser();
  const { profile } = session ? await getOwnProfile(session.uid) : { profile: null };
  let membership: WalletView = emptyWallet();
  if (session) {
    membership = await getMembership(session.uid);
  }
  const ownPhotoSrc =
    session && profile?.photos?.[0]?.storagePath
      ? photoSrc(session.uid, profile.photos[0].storagePath)
      : null;

  // Live suggestions: prefer real discoverable profiles (storage photos render
  // via /api/photos), falling back to design-review demo cards.
  let suggestions = demoProfileViews.slice(0, 2);
  let usingDemo = true;
  if (session) {
    try {
      const live = await getDiscoverProfiles(session.uid);
      if (live.length > 0) {
        suggestions = live.slice(0, 2);
        usingDemo = false;
      }
    } catch {
      // Keep demo fallback when discovery is unavailable.
    }
  }

  const completion = computeProfileCompletion(profile);
  const completionItems = completion.missing.length > 0
    ? [
        ...completion.completed.map((label) => ({ label, done: true })),
        ...completion.missing.map((label) => ({ label, done: false })),
      ]
    : completion.completed.map((label) => ({ label, done: true }));

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Welcome back"
        title="Your corner"
        subtitle="A quiet home base for your relationship life — connections, conversations, and moments in one place."
        actions={<Button href="/discover">Discover</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Profile completion */}
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold text-ink-100">Profile completion</h2>
              <span className="text-sm font-semibold text-brand-400">{completion.percentage}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={completion.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completion"
              className="h-2 overflow-hidden rounded-full bg-ink-700/50"
            >
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${completion.percentage}%` }} />
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {completionItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm text-ink-300">
                  <span
                    aria-hidden
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      item.done ? "bg-success-800/50 text-success-300" : "bg-ink-700/50 text-ink-400",
                    ].join(" ")}
                  >
                    <Icon name={item.done ? "check" : "plus"} className="h-3 w-3" />
                  </span>
                  <span className={item.done ? "line-through opacity-60" : ""}>{item.label}</span>
                </li>
              ))}
            </ul>
            <div>
              <Button href="/profile" size="sm" variant="secondary">Continue setup</Button>
            </div>
          </Card>

          {/* Suggested connections */}
          <section aria-labelledby="suggested-heading" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 id="suggested-heading" className="font-semibold text-ink-100">Suggested for you</h2>
              <Button href="/discover" size="sm" variant="ghost">See all</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <ProfileCard key={suggestion.id} profile={suggestion} />
              ))}
            </div>
            {usingDemo ? (
              <p className="text-xs text-ink-400">
                Suggestions use sample profiles for design review — real suggestions appear once the
                community grows.
              </p>
            ) : null}
          </section>

          {/* Recent activity */}
          <section aria-labelledby="activity-heading" className="flex flex-col gap-4">
            <h2 id="activity-heading" className="font-semibold text-white">Recent activity</h2>
            <Card padding="none" className="divide-y divide-ink-700">
              {demoActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
                    <Icon
                      name={item.kind === "message" ? "chat" : item.kind === "connection" ? "couple" : "sparkle"}
                      className="h-4 w-4"
                    />
                  </span>
                  <p className="flex-1 text-sm text-ink-200">{item.text}</p>
                  <span className="shrink-0 text-xs text-ink-400">{item.at}</span>
                </div>
              ))}
            </Card>
          </section>
        </div>

        {/* Side column */}
        <div className="flex flex-col gap-6">
          <WalletMenu initial={membership} variant="card" />

          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold text-white">Quick actions</h2>
            {quickActions.map((action) => (
              <a
                key={action.href + action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-slate-900/90 px-3 py-2.5 text-sm font-medium text-ink-100 shadow-lg shadow-orange-500/5 transition-colors hover:border-orange-500/60"
              >
                <Icon name={action.icon} className="h-4 w-4 text-brand-300" />
                {action.label}
              </a>
            ))}
          </Card>

          <ContentSlot placement="dashboard" />

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Notifications</h2>
              <Button href="/notifications" size="sm" variant="ghost">View all</Button>
            </div>
            <ul className="flex flex-col gap-2">
              {demoNotifications.slice(0, 3).map((n) => (
                <li key={n.id} className="flex items-start gap-2.5 text-sm">
                  <span
                    aria-hidden
                    className={[
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.unread ? "bg-brand-600" : "bg-transparent",
                    ].join(" ")}
                  />
                  <div>
                    <p className="text-ink-200">{n.text}</p>
                    <span className="text-xs text-ink-400">{n.at}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card tone="muted" className="flex items-center gap-3">
            {ownPhotoSrc ? (
              <img
                src={ownPhotoSrc}
                alt={profile?.displayName ?? "Your profile photo"}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <Avatar name={profile?.displayName ?? "You"} size="md" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {profile?.displayName ?? session?.email ?? "Welcome"}
              </p>
              <p className="truncate text-xs text-ink-300">
                {profile?.bio ?? "Your uploaded storage photo appears here."}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
