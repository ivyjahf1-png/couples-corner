import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/app/Avatar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { getSessionUser } from "@/lib/auth/authorization";
import { listBlocked } from "@/lib/server/safety";
import { SESSION_COOKIE_NAME } from "@/lib/server/session";
import { listMfaFactors } from "@/lib/server/account-security";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { MfaSection } from "@/components/settings/MfaSection";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { BlockedRowClient } from "./blocked/BlockedRowClient";
import { ClearCacheButton } from "@/components/settings/ClearCacheButton";
import type { BlockedUser } from "@/lib/feature/types";

/**
 * Settings � real settings interface. The Security section (password, 2FA,
 * active sessions) and Blocked users are wired to Supabase-backed server
 * services; remaining controls are placeholders pending their server work.
 */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 flex flex-col gap-4">
      <div>
        <h2 id={`${id}-heading`} className="font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-300">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {hint ? <p className="text-sm text-ink-300">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const inputClasses =
  "h-10 w-full max-w-xs rounded-xl border border-ink-700 bg-surface px-3 text-sm text-white focus:border-brand-500/60 focus:outline-none";

export default async function SettingsPage() {
  const user = await getSessionUser();
  const token = user ? ((await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null) : null;

  let mfaEnabled = false;
  let mfaFactorId: string | null = null;
  let mfaError: string | null = null;
  let blocked: BlockedUser[] = [];

  if (user && token) {
    try {
      const factors = await listMfaFactors(token);
      const verified = factors.find((f) => f.status === "verified");
      mfaEnabled = Boolean(verified);
      mfaFactorId = verified?.id ?? null;
    } catch (err) {
      mfaError = err instanceof Error ? err.message : null;
    }
    try {
      blocked = await listBlocked(user.uid);
    } catch {
      blocked = [];
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Settings"
        title="Your settings"
        subtitle="Manage your account, privacy, and how Couples Corner works for you."
      />

      <div className="flex max-w-3xl flex-col gap-10">
        {/* Account */}
        <Section id="account" title="Account" description="Your core identity on Couples Corner.">
          <Card padding="none" className="divide-y divide-ink-700">
            <Row label="Email" hint="Used for sign-in and notifications.">
              <span className="text-sm text-ink-200">demo@couplescorner.app</span>
            </Row>
            <Row label="Display name" hint="Shown on your profile and messages.">
              <input className={inputClasses} defaultValue="Demo User" aria-label="Display name" />
            </Row>
            <Row label="Status" hint="Visible on your profile.">
              <Chip tone="success" leadingDot>Active</Chip>
            </Row>
          </Card>
        </Section>

        {/* Profile */}
        <Section id="profile" title="Profile" description="How you appear to others.">
          <Card padding="none" className="divide-y divide-ink-700">
            <div className="flex items-center gap-4 px-5 py-4">
              <Avatar name="Demo User" size="lg" />
              <div>
                <p className="text-sm font-medium text-white">Profile photo</p>
                <p className="text-sm text-ink-300">Uploads arrive with Firebase Storage.</p>
              </div>
            </div>
            <Row label="About you" hint="A short intro shown on your profile.">
              <span className="text-sm text-ink-300">Edit from your profile page</span>
            </Row>
            <Row label="Interests" hint="Used to suggest meaningful connections.">
              <Chip tone="brand">4 added</Chip>
            </Row>
          </Card>
        </Section>

        {/* Privacy */}
        <Section id="privacy" title="Privacy" description="Control who can find and see you.">
          <Card padding="none" className="divide-y divide-ink-700">
            <Row label="Profile visibility" hint="Who can view your full profile.">
              <select className={inputClasses} defaultValue="connections" aria-label="Profile visibility">
                <option value="everyone">Everyone on Couples Corner</option>
                <option value="connections">Connections only</option>
                <option value="private">Private</option>
              </select>
            </Row>
            <Row label="Appear in discovery" hint="Allow your profile to appear in Discover.">
              <input type="checkbox" defaultChecked className="h-5 w-5 accent-brand-500" aria-label="Appear in discovery" />
            </Row>
            <Row label="Show location" hint="Display your city on your profile.">
              <input type="checkbox" defaultChecked className="h-5 w-5 accent-brand-500" aria-label="Show location" />
            </Row>
          </Card>
        </Section>

        {/* Notifications */}
        <Section id="notifications" title="Notifications" description="Choose what we tell you about.">
          <Card padding="none" className="divide-y divide-ink-700">
            <Row label="Connection requests" hint="When someone wants to connect.">
              <input type="checkbox" defaultChecked className="h-5 w-5 accent-brand-500" aria-label="Connection requests" />
            </Row>
            <Row label="New messages" hint="When a connection messages you.">
              <input type="checkbox" defaultChecked className="h-5 w-5 accent-brand-500" aria-label="New messages" />
            </Row>
            <Row label="Product updates" hint="Occasional news about Couples Corner.">
              <input type="checkbox" className="h-5 w-5 accent-brand-500" aria-label="Product updates" />
            </Row>
          </Card>
        </Section>

        {/* Security */}
        <Section id="security" title="Security" description="Keep your account safe.">
          <Card padding="none" className="divide-y divide-ink-700">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Password</p>
                <p className="text-sm text-ink-300">
                  Verified against Supabase Auth � you&apos;ll need your current password.
                </p>
              </div>
              <div className="shrink-0">
                {user ? (
                  <ChangePasswordForm />
                ) : (
                  <span className="text-sm text-ink-300">Sign in to manage</span>
                )}
              </div>
            </div>

            <Row label="Two-factor authentication" hint="An authenticator-app code on every sign-in.">
              {user ? (
                <MfaSection enabled={mfaEnabled} factorId={mfaFactorId} loadError={mfaError} />
              ) : (
                <span className="text-sm text-ink-300">Sign in to manage</span>
              )}
            </Row>          </Card>
        </Section>

        {/* Blocked users */}
        <Section id="blocked" title="Blocked users" description="People you've blocked can't find or contact you.">
          <Card padding="none">
            {blocked.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-white">No blocked users</p>
                <p className="mt-1 text-sm text-ink-300">
                  When you block someone, they&apos;ll appear here and you can unblock them anytime.
                </p>
                <Link
                  href="/settings/blocked"
                  className="mt-4 inline-block text-sm font-medium text-brand-300 hover:text-brand-200"
                >
                  Manage blocked users
                </Link>
              </div>
            ) : (
              <>
                <div className="divide-y divide-ink-700">
                  {blocked.slice(0, 5).map((entry) => (
                    <BlockedRowClient key={entry.id} entry={entry} />
                  ))}
                </div>
                {blocked.length > 5 ? (
                  <div className="border-t border-ink-700 px-5 py-3 text-center">
                    <Link
                      href="/settings/blocked"
                      className="text-sm font-medium text-brand-300 hover:text-brand-200"
                    >
                      View all {blocked.length} blocked users
                    </Link>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </Section>

        {/* SOYO-style quick settings menu */}
        <Section id="quick-settings" title="Quick settings" description="Account, wallet and app preferences at a glance.">
          <Card padding="none" className="divide-y divide-ink-700">
            <Link href="/settings/blocked" className="flex items-center justify-between px-5 py-4 transition hover:bg-white/[0.04]">
              <span className="text-sm font-medium text-white">Bind account</span>
              <span aria-hidden className="text-ink-400">�</span>
            </Link>
            <Link href="/aristocracy" className="flex items-center justify-between px-5 py-4 transition hover:bg-white/[0.04]">
              <span className="text-sm font-medium text-white">Charge settings</span>
              <span aria-hidden className="text-ink-400">�</span>
            </Link>
            <Row label="Rights Center" hint="Your VIP & SVIP benefits live here.">
              <Link href="/aristocracy" className="text-sm font-medium text-amber-300 hover:text-amber-200">Open</Link>
            </Row>
            <Row label="Chat settings" hint="Read receipts, who can message you.">
              <Link href="/settings#chat" className="text-sm font-medium text-amber-300 hover:text-amber-200">Open</Link>
            </Row>
            <Link href="/settings/blocked" className="flex items-center justify-between px-5 py-4 transition hover:bg-white/[0.04]">
              <span className="text-sm font-medium text-white">Blocked List</span>
              <span aria-hidden className="text-ink-400">�</span>
            </Link>
            <Row label="Language" hint="English (US)">
              <span aria-hidden className="text-ink-400">�</span>
            </Row>
            <Row label="Clear cache" hint="Free up temporary files on this device.">
              <ClearCacheButton />
            </Row>
            <Link href="/contact" className="flex items-center justify-between px-5 py-4 transition hover:bg-white/[0.04]">
              <span className="text-sm font-medium text-white">About Couple's Corner</span>
              <span aria-hidden className="text-ink-400">�</span>
            </Link>
            <Row label="Sign out" hint="End your session on this device.">
              {user ? <LogoutButton /> : <span className="text-sm text-ink-300">Not signed in</span>}
            </Row>
          </Card>
        </Section>

        {/* Account management */}
        <Section
          id="account-management"
          title="Account management"
          description="Take a break or leave � it&apos;s your corner."
        >
          <Card padding="none" className="divide-y divide-ink-700">
            <Row label="Log out" hint="End your session on this device and return to the login page.">
              {user ? <LogoutButton /> : <span className="text-sm text-ink-300">Not signed in</span>}
            </Row>
            <Row label="Deactivate account" hint="Temporarily hide your profile and pause activity.">
              <span className="text-sm font-medium text-ink-200">Deactivate</span>
            </Row>
            <Row label="Delete account" hint="Permanently remove your account and data.">
              <span className="text-sm font-medium text-danger-300">Delete account</span>
            </Row>
          </Card>
        </Section>

        {/* Footer links */}
        <footer aria-label="Legal and support links" className="flex flex-col items-center gap-2 pb-6 pt-2 text-center">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-400">
            <Link href="/legal/privacy" className="hover:text-ink-200">Privacy Policy</Link>
            <span aria-hidden>�</span>
            <Link href="/legal/terms" className="hover:text-ink-200">Terms of Service</Link>
            <span aria-hidden>�</span>
            <Link href="/contact" className="hover:text-ink-200">Contact us</Link>
          </nav>
          <Link href="/settings#account-management" className="text-xs text-danger-300/80 hover:text-danger-300">
            Delete Account
          </Link>
        </footer>
      </div>
    </div>
  );
}

