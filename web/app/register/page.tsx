import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/Logo";
import { AuthIllustration } from "@/components/auth/AuthIllustration";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Sign Up — Couple's Corner",
  description: "Create your Couple's Corner account and start building a lasting partnership.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-orange-500/30 bg-slate-900/90 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="Couples Corner home">
            <Logo as="span" />
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl shadow-black/40">
          {/* Dynamic illustration — loads from the admin panel's "auth" placement. */}
          <AuthIllustration />

          <div className="p-8">
            <h1 className="text-2xl font-bold tracking-display text-white">Register</h1>
            <p className="mt-1.5 text-sm text-white/60">
              Ready to start building your lasting partnership? Create your Couple&apos;s Corner account.
            </p>

            <div className="mt-6">
              <Suspense fallback={null}>
                <RegisterForm />
              </Suspense>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-orange-400 hover:text-orange-300">
            Log in
          </Link>
        </p>
      </section>
    </div>
  );
}
