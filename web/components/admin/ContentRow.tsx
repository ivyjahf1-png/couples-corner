"use client";

import { useState } from "react";
import { Icon } from "@/components/landing/Icon";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { ContentItem, ContentStatus } from "@/lib/models/content";
import {
  publishContentAction,
  unpublishContentAction,
  archiveContentAction,
  deleteContentAction,
} from "@/lib/actions/content";

interface ContentRowProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  adminUid: string;
}

const statusChip: Record<ContentStatus, "success" | "brand" | "neutral" | "danger"> = {
  published: "success",
  scheduled: "brand",
  draft: "neutral",
  archived: "danger",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ContentRow({ item, onEdit, adminUid }: ContentRowProps) {
  const [busy, setBusy] = useState(false);

  async function handleAction(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {item.thumbnailUrl || item.mediaUrl ? (
            /* eslint-disable @next/next/no-img-element */
            <img
              src={item.thumbnailUrl ?? item.mediaUrl}
              alt=""
              className="h-12 w-16 shrink-0 rounded-lg border border-ink-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-surface-muted">
              <Icon name="moments" className="h-5 w-5 text-ink-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">{item.title}</p>
            <p className="truncate text-xs text-ink-500">
              {item.category} · priority {item.priority}
            </p>
          </div>
        </div>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <Chip tone={statusChip[item.status]}>{item.status}</Chip>
      </td>
      <td className="hidden px-4 py-3 text-sm text-ink-600 md:table-cell">{item.placement}</td>
      <td className="hidden px-4 py-3 text-sm text-ink-600 lg:table-cell">
        {formatDate(item.startAt)} – {formatDate(item.endAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.status !== "published" && item.status !== "archived" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => handleAction(() => publishContentAction(item.id, adminUid))}
            >
              Publish
            </Button>
          )}
          {item.status === "published" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => handleAction(() => unpublishContentAction(item.id, adminUid))}
            >
              Unpublish
            </Button>
          )}
          {item.status !== "archived" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => handleAction(() => archiveContentAction(item.id, adminUid))}
            >
              Archive
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => onEdit(item)} disabled={busy}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => handleAction(() => deleteContentAction(item.id, adminUid))}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}