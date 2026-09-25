import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { InviteCodeStash } from "./invite-code-stash";
import { normalizeInviteCode } from "@/lib/utils/invite";

/**
 * Public invite landing page (Server Component).
 *
 * Validates the code format, then hands it to a tiny client component that
 * stashes it in localStorage before the visitor follows the link to
 * `/register?invite=CODE`. The stash is what survives a visitor who navigates
 * to /register directly, or who signs up via a social provider that drops the
 * query string; RegisterForm reads it back as a fallback.
 */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeInviteCode(code);
  if (!normalized) notFound();

  return (
    <>
      <InviteCodeStash code={normalized} />
      <main className="grid min-h-dvh place-items-center bg-[#0B1120] px-6 text-white"><section className="w-full max-w-md rounded-3xl border border-white/15 bg-white/5 p-8 text-center"><Logo className="mx-auto" /><p className="mt-6 text-sm text-white/60">You were invited by</p><h1 className="mt-2 text-3xl font-extrabold">Join Couple&apos;s Corner</h1><p className="mt-3 text-lg font-bold text-orange-300">{normalized}</p><p className="mt-3 text-sm text-white/70">Create your account and start building meaningful connections.</p><Link href={`/register?invite=${normalized}`} className="mt-7 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-bold text-white">Accept invitation</Link></section></main>
    </>
  );
}
