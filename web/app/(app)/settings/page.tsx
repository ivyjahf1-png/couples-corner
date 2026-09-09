import type { ReactNode } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/app/Avatar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

/**
 * Settings â€” a real, navigable settings interface. Controls will call Server
 * Actions once Firebase exists; until then they render in their default state
 * with no fake persistence.
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
        <h2 id={`${id}-heading`} className="font-semibold text-ink-900">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-900">{label}</p>
        {hint ? <p className="text-sm text-ink-600">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const inputClasses =
  "h-10 w-full max-w-xs rounded-xl border border-ink-200 bg-surface px-3 text-sm text-ink-900 focus:border-brand-400 focus:outline-none";

export default function SettingsPage() {
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
          <Card padding="none" className="divide-y divide-ink-200">
            <Row label="Email" hint="Used for sign-in and notifications.">
              <span className="text-sm text-ink-700">demo@couplescorner.app</span>
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
          <Card padding="none" className="divide-y divide-ink-200">
            <div className="flex items-center gap-4 px-5 py-4">
              <Avatar name="Demo User" size="lg" />
              <div>
                <p className="text-sm font-medium text-ink-900">Profile photo</p>
                <p className="text-sm text-ink-600">Uploads arrive with Firebase Storage.</p>
              </div>
            </div>
            <Row label="About you" hint="A short intro shown on your profile.">
              <span className="text-sm text-ink-600">Edit from your profile page</span>
            </Row>
            <Row label="Interests" hint="Used to suggest meaningful connections.">
              <Chip tone="brand">4 added</Chip>
            </Row>
          </Card>
        </Section>

        {/* Privacy */}
        <Section id="privacy" title="Privacy" description="Control who can find and see you.">
          <Card padding="none" className="divide-y divide-ink-200">
            <Row label="Profile visibility" hint="Who can view your full profile.">
              <select className={inputClasses} defaultValue="connections" aria-label="Profile visibility">
                <option value="everyone">Everyone on Couples Corner</option>
                <option value="connections">Connections only</option>
                <option value="private">Private</option>
              </select>
            </Row>
            <Row label="Appear in discovery" hint="Allow your profile to appear in Discover.">
              <input type="checkbox" defaultChecked className="h-5 w-5 accent-brand-700" aria-label="Appear in discovery" />
            </Row>
            <Row label="Show location" hint="Display your city on your profile.">
              <input type="checkbox" defaultChecked className="h-5 w-5 accent-brand-700" aria-label="Show location" />
            </Row>
          </Card>
        </Section>

        {/* Notifications */}
        <Section id="notifications" title="Notifications" description="Choose what we tell you about.">
          <Card padding="none" className="divide-y divide-ink-200">
            <Row label="Connection requests" hint="When someone wants to connect.">
              <input type="checkbox" defaultChecked className="h-5 w-5 accent-brand-700" aria-label="Connection requests" />
            </Row>
            <Row label="New messages" hint="When a connection messages you.">
              <input type="checkbox" defaultChecked className="h-5 w-5 accent-brand-700" aria-label="New messages" />
            </Row>
            <Row label="Product updates" hint="Occasional news about Couples Corner.">
              <input type="checkbox" className="h-5 w-5 accent-brand-700" aria-label="Product updates" />
            </Row>
          </Card>
        </Section>

        {/* Security */}
        <Section id="security" title="Security" description="Keep your account safe.">
          <Card padding="none" className="divide-y divide-ink-200">
            <Row label="Password" hint="Last changed recently.">
              <span className="text-sm font-medium text-brand-700">Change password</span>
            </Row>
            <Row label="Two-factor authentication" hint="An extra layer of protection.">
              <Chip tone="neutral">Coming with Firebase Auth</Chip>
            </Row>
            <Row label="Active sessions" hint="Devices currently signed in.">
              <span className="text-sm text-ink-600">1 device</span>
            </Row>
          </Card>
        </Section>

        {/* Blocked users */}
        <Section id="blocked" title="Blocked users" description="People you've blocked can't find or contact you.">
          <Card padding="none">
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-medium text-ink-900">No blocked users</p>
              <p className="mt-1 text-sm text-ink-600">
                When you block someone, they&apos;ll appear here and you can unblock them anytime.
              </p>
            </div>
          </Card>
        </Section>

        {/* Account management */}
        <Section
          id="account-management"
          title="Account management"
          description="Take a break or leave â€” it&apos;s your corner."
        >
          <Card padding="none" className="divide-y divide-ink-200">
            <Row label="Deactivate account" hint="Temporarily hide your profile and pause activity.">
              <span className="text-sm font-medium text-ink-700">Deactivate</span>
            </Row>
            <Row label="Delete account" hint="Permanently remove your account and data.">
              <span className="text-sm font-medium text-danger-700">Delete account</span>
            </Row>
          </Card>
        </Section>
      </div>
    </div>
  );
}
