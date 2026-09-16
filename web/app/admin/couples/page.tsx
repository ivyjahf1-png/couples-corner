import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/landing/Icon";

export default function AdminCouplesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Couples"
        title="Couple profiles"
        subtitle="View and manage couple profiles registered on the platform."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-ink-700 bg-surface p-4 shadow-sm">
          <p className="text-2xl font-semibold text-white">—</p>
          <p className="text-xs text-ink-400">Total couples</p>
        </div>
        <div className="rounded-2xl border border-ink-700 bg-surface p-4 shadow-sm">
          <p className="text-2xl font-semibold text-white">—</p>
          <p className="text-xs text-ink-400">Active this week</p>
        </div>
        <div className="rounded-2xl border border-ink-700 bg-surface p-4 shadow-sm">
          <p className="text-2xl font-semibold text-white">—</p>
          <p className="text-xs text-ink-400">New this month</p>
        </div>
        <div className="rounded-2xl border border-ink-700 bg-surface p-4 shadow-sm">
          <p className="text-2xl font-semibold text-white">—</p>
          <p className="text-xs text-ink-400">With posts</p>
        </div>
      </div>

      {/* Couple list */}
      <Card tone="raised" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
            <Icon name="couple" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">All couples</h2>
            <p className="text-sm text-ink-400">Browse and manage couple accounts.</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-700 bg-surface-muted px-6 py-16 text-center">
          <Icon name="couple" className="h-10 w-10 text-ink-400" />
          <p className="text-lg font-semibold text-white">No couples yet</p>
          <p className="text-sm text-ink-400">Couple profiles will appear here once users create them.</p>
        </div>
      </Card>
    </div>
  );
}