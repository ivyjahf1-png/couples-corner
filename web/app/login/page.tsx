import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { AuthIllustration } from "@/components/auth/AuthIllustration";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Log In — Couple's Corner",
  description: "Sign in to continue your journey together.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-950 text-white">
      <nav className="shrink-0 border-b border-orange-500/30 bg-slate-900/90 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="Couples Corner home">
            <Logo as="span" />
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-16">
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl shadow-black/40">
          {/* Dynamic illustration — loads from the admin panel's "auth" placement. */}
          <AuthIllustration />

          <div className="p-5 sm:p-8">
            <h1 className="text-2xl font-bold tracking-display text-white">Login</h1>
            <p className="mt-1.5 text-sm text-white/60">
              Welcome back to Couple&apos;s Corner. Sign in to continue your journey.
            </p>

            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/60">
          Need an account?{" "}
          <Link href="/register" className="font-medium text-orange-400 hover:text-orange-300">
            Sign up
          </Link>
        </p>
      </section>
    </div>
  );
}
