import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { notFound } from "next/navigation";

export default async function InviteRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^\d{2}[A-Z]{4}$/.test(code)) notFound();
  return <main className="flex min-h-dvh items-center justify-center bg-[#0B1120] p-6"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-2xl"><Logo className="mx-auto" /><h1 className="mt-6 text-2xl font-bold text-white">You&apos;re invited to Couple&apos;s Corner</h1><p className="mt-2 text-sm text-white/60">Someone special would love you to join their circle.</p><Link href={`/?ref=${code}`} className="mt-7 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white">Open Couple&apos;s Corner</Link><p className="mt-5 text-xs uppercase tracking-[0.3em] text-orange-200">Invite {code}</p></div></main>;
}
