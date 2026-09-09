"use client";

import { useState } from "react";
import { Icon } from "@/components/landing/Icon";
import { Button } from "@/components/ui/Button";
import type { ContentItem } from "@/lib/models/content";
import {
  CONTENT_CATEGORIES,
  CONTENT_PLACEMENTS,
  CONTENT_STATUSES,
  type ContentCategory,
} from "@/lib/models/content";
import { ContentForm } from "./ContentForm";
import { ContentRow } from "./ContentRow";

interface Props {
  initialContent: ContentItem[];
  stats: {
    total: number;
    published: number;
    scheduled: number;
    draft: number;
    archived: number;
  };
  adminUid: string;
}

const CATEGORY_LABELS: Record<ContentCategory, string> = {
  advertisement: "Advertisements",
  photo: "Photos",
  video: "Videos",
  announcement: "Announcements",
  featured: "Featured",
};

export function AdminContentClient({ initialContent, stats, adminUid }: Props) {
  const [activeTab, setActiveTab] = useState<ContentCategory>("advertisement");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [placementFilter, setPlacementFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  const filtered = initialContent.filter(
    (c) =>
      c.category === activeTab &&
      (!statusFilter || c.status === statusFilter) &&
      (!placementFilter || c.placement === placementFilter)
  );

  const statCards = [
    { label: "Total", value: stats.total, tone: "neutral" as const },
    { label: "Published", value: stats.published, tone: "success" as const },
    { label: "Scheduled", value: stats.scheduled, tone: "brand" as const },
    { label: "Drafts", value: stats.draft, tone: "neutral" as const },
    { label: "Archived", value: stats.archived, tone: "danger" as const },
  ];

  function handleNew() {
    setEditingItem(null);
    setShowForm(true);
  }
  function handleEdit(item: ContentItem) {
    setEditingItem(item);
    setShowForm(true);
  }
  function handleClose() {
    setShowForm(false);
    setEditingItem(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink-200 bg-surface p-3 text-center shadow-sm">
            <p className="text-2xl font-semibold text-ink-900">{s.value}</p>
            <p className="text-xs text-ink-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Content categories">
        {CONTENT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeTab === cat}
            onClick={() => setActiveTab(cat)}
            className={[
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              activeTab === cat
                ? "border-brand-600 bg-brand-100 text-brand-800"
                : "border-ink-200 bg-surface text-ink-700 hover:bg-surface-muted",
            ].join(" ")}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-ink-200 bg-surface px-3 text-sm text-ink-800"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            className="h-10 rounded-xl border border-ink-200 bg-surface px-3 text-sm text-ink-800"
            aria-label="Filter by placement"
          >
            <option value="">All placements</option>
            {CONTENT_PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleNew}>
          <Icon name="plus" className="h-4 w-4" />
          Add {CATEGORY_LABELS[activeTab].replace(/s$/, "").toLowerCase()}
        </Button>
      </div>

      {/* Content list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-200 bg-surface-muted px-6 py-16 text-center">
          <Icon name="moments" className="h-10 w-10 text-ink-400" />
          <div>
            <p className="text-lg font-semibold text-ink-900">No {CATEGORY_LABELS[activeTab].toLowerCase()} yet</p>
            <p className="mt-1 text-sm text-ink-600">
              {statusFilter || placementFilter
                ? "No content matches these filters. Try clearing them."
                : "Admins can upload photos, videos, announcements and advertisements to appear in designated slots."}
            </p>
          </div>
          <Button onClick={handleNew} variant="secondary">
            Create content
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 font-medium text-ink-700">Content</th>
                  <th className="hidden px-4 py-3 font-medium text-ink-700 sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 font-medium text-ink-700 md:table-cell">Placement</th>
                  <th className="hidden px-4 py-3 font-medium text-ink-700 lg:table-cell">Schedule</th>
                  <th className="px-4 py-3 font-medium text-ink-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {filtered.map((item) => (
                  <ContentRow key={item.id} item={item} onEdit={handleEdit} adminUid={adminUid} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <ContentForm
          category={activeTab}
          editingItem={editingItem}
          adminUid={adminUid}
          onClose={handleClose}
        />
      )}
    </div>
  );
}