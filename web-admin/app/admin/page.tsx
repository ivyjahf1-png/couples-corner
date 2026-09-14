import { getDashboardMetricsAction, getRecentActivityAction } from "@/lib/actions/dashboard";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import { PageHeader } from "@/components/app/PageHeader";
import { Icon, type IconName } from "@/components/landing/Icon";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ACTIVITY_ICON: Record<string, IconName> = {
  signup: "profile",
  report: "flag",
  support: "chat",
  subscription: "sparkle",
};

const ACTIVITY_TONE: Record<string, string> = {
  signup: "bg-emerald-900/40 text-emerald-400",
  report: "bg-red-900/40 text-red-400",
  support: "bg-orange-900/40 text-orange-400",
  subscription: "bg-orange-900/40 text-orange-400",
};

export default async function AdminDashboardPage() {
  let metrics = { totalUsers: 0, newUsersToday: 0, newCouplesToday: 0, activeSubscriptions: 0, openReports: 0, openSupportTickets: 0 };
  let activities: { id: string; type: string; description: string; timestamp: string }[] = [];

  try {
    [metrics, activities] = await Promise.all([
      getDashboardMetricsAction(),
      getRecentActivityAction(),
    ]);
  } catch (err) {
    rethrowIfNavigation(err);
    console.error("Failed to load dashboard data:", err);
  }

  const statCards = [
    { label: "Total Users", value: formatNumber(metrics.totalUsers), icon: "profile" as IconName, tone: "bg-orange-900/40 text-orange-400" },
    { label: "New Today", value: formatNumber(metrics.newUsersToday), icon: "sparkle" as IconName, tone: "bg-emerald-900/40 text-emerald-400" },
    { label: "New Couples", value: formatNumber(metrics.newCouplesToday), icon: "couple" as IconName, tone: "bg-orange-900/40 text-orange-400" },
    { label: "Active Subs", value: formatNumber(metrics.activeSubscriptions), icon: "bell" as IconName, tone: "bg-emerald-900/40 text-emerald-400" },
    { label: "Open Reports", value: formatNumber(metrics.openReports), icon: "flag" as IconName, tone: "bg-red-900/40 text-red-400" },
    { label: "Support Tickets", value: formatNumber(metrics.openSupportTickets), icon: "chat" as IconName, tone: "bg-orange-900/40 text-orange-400" },
  ];

  return (
    <ErrorBoundary feature="Dashboard">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Admin"
          title="Overview"
          subtitle="Real-time platform metrics and recent activity at a glance."
        />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-orange-500/20 bg-slate-900 p-4 shadow-md">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon name={card.icon} className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold text-white">{card.value}</p>
              <p className="text-xs text-slate-400">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-orange-500/20 bg-slate-900 p-6 shadow-md">
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          {activities.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No recent activity to display.</p>
          ) : (
            <ul className="mt-4 divide-y divide-orange-500/10">
              {activities.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ACTIVITY_TONE[item.type] ?? "bg-slate-800 text-slate-400"}`}>
                    <Icon name={ACTIVITY_ICON[item.type] ?? "bell"} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">{item.description}</p>
                    <p className="text-xs text-slate-500">{timeAgo(item.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
