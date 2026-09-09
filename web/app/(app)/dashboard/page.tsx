import { PageHeader } from "@/components/app/PageHeader";
import { ProfileCard } from "@/components/app/ProfileCard";
import { Avatar } from "@/components/app/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { ContentSlot } from "@/components/content/ContentSlot";
import { demoActivity, demoNotifications, demoProfileViews } from "@/lib/demo/demo-data";

/* Structural demo content only — replaced by Firestore reads later. */
const profileCompletion = 60;

const quickActions = [
  { href: "/discover", icon: "discover" as const, label: "Discover people & couples" },
  { href: "/profile", icon: "profile" as const, label: "Complete your profile" },
  { href: "/messages", icon: "chat" as const, label: "Open messages" },
];

const completionItems = [
  { label: "Display name & avatar", done: true },
  { label: "About you", done: true },
  { label: "Interests (3+)", done: false },
  { label: "Couple profile", done: false },
];

export default function DashboardPage() {
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
              <h2 className="font-semibold text-ink-900">Profile completion</h2>
              <span className="text-sm font-semibold text-brand-700">{profileCompletion}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={profileCompletion}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completion"
              className="h-2 overflow-hidden rounded-full bg-ink-100"
            >
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${profileCompletion}%` }} />
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {completionItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm text-ink-700">
                  <span
                    aria-hidden
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      item.done ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-500",
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
              <h2 id="suggested-heading" className="font-semibold text-ink-900">Suggested for you</h2>
              <Button href="/discover" size="sm" variant="ghost">See all</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {demoProfileViews.slice(0, 2).map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
            <p className="text-xs text-ink-500">
              Suggestions use sample profiles for design review — real suggestions appear once the
              community grows.
            </p>
          </section>

          {/* Recent activity */}
          <section aria-labelledby="activity-heading" className="flex flex-col gap-4">
            <h2 id="activity-heading" className="font-semibold text-ink-900">Recent activity</h2>
            <Card padding="none" className="divide-y divide-ink-200">
              {demoActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <Icon
                      name={item.kind === "message" ? "chat" : item.kind === "connection" ? "couple" : "sparkle"}
                      className="h-4 w-4"
                    />
                  </span>
                  <p className="flex-1 text-sm text-ink-700">{item.text}</p>
                  <span className="shrink-0 text-xs text-ink-500">{item.at}</span>
                </div>
              ))}
            </Card>
          </section>
        </div>

        {/* Side column */}
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold text-ink-900">Quick actions</h2>
            {quickActions.map((action) => (
              <a
                key={action.href + action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-ink-200 bg-surface px-3 py-2.5 text-sm font-medium text-ink-800 transition hover:border-ink-300 hover:bg-surface-muted"
              >
                <Icon name={action.icon} className="h-4 w-4 text-brand-700" />
                {action.label}
              </a>
            ))}
          </Card>

          <ContentSlot placement="dashboard" />

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">Notifications</h2>
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
                    <p className="text-ink-700">{n.text}</p>
                    <span className="text-xs text-ink-500">{n.at}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card tone="muted" className="flex items-center gap-3">
            <Avatar name="Demo User" size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">Demo User</p>
              <p className="truncate text-xs text-ink-600">
                Preview session — sign-in arrives with Firebase Auth.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
