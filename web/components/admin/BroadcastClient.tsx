"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Icon } from "@/components/landing/Icon";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  BROADCAST_AUDIENCES,
  BROADCAST_TYPES,
  type Broadcast,
  type BroadcastAudience,
  type BroadcastType,
} from "@/lib/models";
import {
  createBroadcastAction,
  sendBroadcastAction,
} from "@/lib/actions/broadcast";

interface Props {
  initialBroadcasts: Broadcast[];
}

const input = "mt-1 w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none";

export function BroadcastClient({ initialBroadcasts }: Props) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [type, setType] = useState<BroadcastType>("announcement");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }
    setBusy(true);
    try {
      const id = await createBroadcastAction({ title, body, audience, type });
      // Prepend the newly created draft locally.
      const draft: Broadcast = {
        id,
        title: title.trim(),
        body: body.trim(),
        audience,
        type,
        createdBy: "",
        status: "draft",
        targetedUserCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sentAt: null,
      };
      setBroadcasts((prev) => [draft, ...prev]);
      setTitle("");
      setBody("");
      setInfo("Draft saved. Use “Send now” to broadcast it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create broadcast.");
    } finally {
      setBusy(false);
    }
  }

  function handleSend(id: string) {
    setBusy(true);
    startTransition(async () => {
      try {
        const count = await sendBroadcastAction(id);
        setInfo(`Broadcast sent to ${count} user${count === 1 ? "" : "s"}.`);
        setBroadcasts((prev) =>
          prev.map((b) =>
            b.id === id
              ? { ...b, status: "sent", targetedUserCount: count, sentAt: new Date().toISOString() }
              : b
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send broadcast.");
      } finally {
        setBusy(false);
      }
    });
  }
return (
    <div className="flex flex-col gap-8">
      {/* Compose */}
      <section className="rounded-2xl border border-ink-200 bg-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Icon name="bell" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">New broadcast</h2>
            <p className="text-sm text-ink-600">Send a platform-wide announcement or alert.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm font-medium text-ink-800">
            Title <span className="text-danger-700">*</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="e.g. We're running scheduled maintenance" />
          </label>
          <label className="text-sm font-medium text-ink-800">
            Message <span className="text-danger-700">*</span>
            <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} className={input} placeholder="Write the announcement body…" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink-800">
              Audience
              <select value={audience} onChange={(e) => setAudience(e.target.value as BroadcastAudience)} className={input}>
                {BROADCAST_AUDIENCES.map((a) => (
                  <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-ink-800">
              Type
              <select value={type} onChange={(e) => setType(e.target.value as BroadcastType)} className={input}>
                {BROADCAST_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="text-sm font-medium text-danger-700">{error}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Create draft"}
            </Button>
          </div>
        </form>
      </section>

      {info ? (
        <div role="status" className="rounded-xl border border-success-300 bg-success-100 px-4 py-3 text-sm text-success-700">
          {info}
        </div>
      ) : null}

      {/* History */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-900">Sent & draft broadcasts</h2>
        {broadcasts.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-200 bg-surface-muted px-6 py-16 text-center">
            <Icon name="bell" className="h-10 w-10 text-ink-400" />
            <p className="text-lg font-semibold text-ink-900">No broadcasts yet</p>
            <p className="text-sm text-ink-600">Compose your first announcement above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {broadcasts.map((b) => (
              <div key={b.id} className="rounded-2xl border border-ink-200 bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-ink-900">{b.title}</p>
                    <Chip tone={b.status === "sent" ? "success" : "neutral"}>{b.status}</Chip>
                    <Chip tone="brand">{b.type}</Chip>
                  </div>
                  {b.status === "draft" ? (
                    <Button size="sm" variant="ghost" disabled={busy || pending} onClick={() => handleSend(b.id)}>
                      Send now
                    </Button>
                  ) : (
                    <span className="text-xs text-ink-600">{b.targetedUserCount} users</span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-600">{b.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}