import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { Avatar } from "@/components/app/Avatar";
import { PageHeader, PageLock } from "@/components/app/PageHeader";
import { getSessionUser } from "@/lib/auth/authorization";
import { searchMembers } from "@/lib/server/profiles";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search — Couple's Corner",
  description: "Find members by their public ID or username.",
};

/**
 * Member search results.
 *
 * Reached from the home feed search bar when a query is not a single
 * unambiguous hit: either several display names match, or nothing does. The
 * exact-code and single-match cases redirect straight to the profile from
 * `app/page.tsx`, so this page only ever renders the ambiguous case.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const session = await getSessionUser();

  const result = query ? await searchMembers(query).catch(() => null) : null;
  const users = result?.kind === "results" ? result.users : [];

  const view = (
    <PageLock
      className="mx-auto w-full max-w-2xl"
      bodyClassName="pb-8"
      head={
        <PageHeader
          eyebrow="Search"
          title={query ? `Results for “${query}”` : "Search"}
          subtitle="Look up a member by their 6-character public ID or their username."
        />
      }
    >
      {users.length === 0 ? (
        <EmptyState
          icon="discover"
          title={query ? "No members matched" : "Start typing to search"}
          body={
            query
              ? "Check the ID or username and try again. Public IDs look like 10ABCD."
              : "Enter a public ID or username in the search bar to find someone."
          }
          action={
            <Link
              href="/"
              className="text-sm font-medium text-brand-300 hover:underline"
            >
              Back to home
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((user) => (
            <li key={user.userId}>
              <Link
                href={`/profile/${user.userId}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface p-3 transition hover:border-white/25 hover:bg-white/5"
              >
                <Avatar name={user.displayName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.displayName}
                  </p>
                  {user.userCode ? (
                    <p className="truncate text-xs uppercase tracking-[0.2em] text-ink-400">
                      {user.userCode}
                    </p>
                  ) : null}
                </div>
                {user.userId === session?.uid ? (
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-ink-300">
                    You
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageLock>
  );

  return session ? <AppShell>{view}</AppShell> : view;
}