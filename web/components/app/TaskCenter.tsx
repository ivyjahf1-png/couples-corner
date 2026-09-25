"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Gift, Sparkles } from "lucide-react";
import { claimTaskAction } from "@/lib/actions/tasks";
import { PageLock } from "@/components/app/PageHeader";
import type { TaskView } from "@/lib/server/tasks";

/**
 * Task Center.
 *
 * Every Claim button is wired to a real Server Action that pays out coins with
 * a server-authoritative amount. Tasks with an `actionRoute` navigate first
 * (e.g. "Upload a Moment Post" opens the upload form) so the user completes
 * the task before claiming. Status resets daily because the server keys
 * progress by the current date.
 */
export function TaskCenter({
  initialTasks,
  signedIn = true,
}: {
  initialTasks: TaskView[];
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskView[]>(initialTasks);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2800);
  }

  function claim(slug: string) {
    setBusySlug(slug);
    startTransition(async () => {
      const result = await claimTaskAction(slug);
      setBusySlug(null);
      if (!result.ok) {
        flash(result.error ?? "Could not claim this reward");
        return;
      }
      setTasks((prev) => prev.map((task) => (task.slug === slug ? { ...task, status: "claimed" } : task)));
      flash(`+${result.rewardCoins} coins added to your wallet`);
      router.refresh();
    });
  }

  return (
    <PageLock
      className="mx-auto w-full max-w-3xl"
      bodyClassName="pb-8"
      head={
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-wide text-white">Task Center</h1>
          <span className="flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-300">
            <Gift className="h-3.5 w-3.5" /> Rewards
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-6">

      <div className="relative flex items-center justify-between overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-orange-600/30 via-amber-600/20 to-purple-900/40 p-6 shadow-2xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Newcomer &amp; Daily</span>
          <h2 className="mt-0.5 text-xl font-black text-white">Earn Coins &amp; Bonuses</h2>
          <p className="mt-1 max-w-[220px] text-xs text-ink-300">Tasks reset every day. Complete them to unlock exclusive perks and level up.</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/20 text-3xl shadow-lg" aria-hidden>
          🎁
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-200">Available Tasks</h3>
        <div className="flex flex-col gap-3">
          {tasks.length === 0 ? (
            <p className="rounded-2xl border border-indigo-500/20 bg-indigo-950/40 p-6 text-center text-sm text-ink-300">
              No tasks available right now. Check back soon.
            </p>
          ) : (
            tasks.map((task) => (
              <article
                key={task.slug}
                className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-950/40 p-4 shadow-lg"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-900/60 text-amber-400">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-white">{task.title}</h4>
                    {task.description ? <p className="truncate text-xs text-ink-400">{task.description}</p> : null}
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300">+{task.rewardCoins} coins</span>
                      <span className="rounded-full border border-indigo-500/20 bg-indigo-900/50 px-2 py-0.5 text-[10px] text-indigo-300">
                        {task.category}
                      </span>
                    </div>
                  </div>
                </div>

                {task.status === "claimed" ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Claimed
                  </span>
                ) : task.actionRoute ? (
                  /* A real <Link> so the task's action route is a genuine,
                     statically-analyzable navigation (middle-clickable,
                     prefetchable) rather than a JS-only push. */
                  <Link
                    href={task.actionRoute}
                    className="shrink-0 rounded-xl border border-indigo-500/40 bg-indigo-900/60 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-800"
                  >
                    Start
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!signedIn) {
                        flash("Sign in to claim rewards");
                        return;
                      }
                      claim(task.slug);
                    }}
                    disabled={busySlug === task.slug || isPending}
                    className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-md transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    {busySlug === task.slug ? "..." : "Claim"}
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      </div>

      {tasks.some((task) => task.actionRoute) ? (
        <p className="text-xs text-ink-400">
          Tasks with a Start button open their activity first - return here to claim the reward.
        </p>
      ) : null}

      {notice ? (
        <p role="status" className="fixed bottom-28 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-white/15 bg-slate-900/95 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          {notice}
        </p>
      ) : null}
      </div>
    </PageLock>
  );
}