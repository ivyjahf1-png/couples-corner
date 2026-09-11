import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";

const inputClass = "mt-1 w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none";
const labelClass = "text-sm font-medium text-ink-800";

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Settings"
        title="Platform configuration"
        subtitle="Manage global platform settings, subscription tiers, and feature flags."
      />

      {/* Subscription tiers */}
      <Card tone="raised" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Icon name="sparkle" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Subscription tiers</h2>
            <p className="text-sm text-ink-500">Configure pricing and features for each tier.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-ink-200 bg-surface-muted p-4">
            <h3 className="font-semibold text-ink-900">Free</h3>
            <p className="mt-1 text-xs text-ink-500">Basic access</p>
            <p className="mt-2 text-2xl font-bold text-ink-900">₦0<span className="text-sm font-normal text-ink-500">/mo</span></p>
          </div>
          <div className="rounded-xl border border-brand-300 bg-brand-50 p-4">
            <h3 className="font-semibold text-brand-800">Gold</h3>
            <p className="mt-1 text-xs text-ink-500">Premium features</p>
            <p className="mt-2 text-2xl font-bold text-brand-800">₦2,500<span className="text-sm font-normal text-ink-500">/mo</span></p>
          </div>
          <div className="rounded-xl border border-ink-300 bg-surface-muted p-4">
            <h3 className="font-semibold text-ink-900">Platinum</h3>
            <p className="mt-1 text-xs text-ink-500">VIP access</p>
            <p className="mt-2 text-2xl font-bold text-ink-900">₦5,000<span className="text-sm font-normal text-ink-500">/mo</span></p>
          </div>
        </div>
      </Card>

      {/* Payment gateway */}
      <Card tone="raised" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100 text-success-700">
            <Icon name="lock" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Payment gateway</h2>
            <p className="text-sm text-ink-500">Configure your payment provider settings.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Paystack public key
            <input type="text" placeholder="pk_live_..." className={inputClass} />
          </label>
          <label className={labelClass}>
            Paystack secret key
            <input type="password" placeholder="sk_live_..." className={inputClass} />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm">Save payment settings</Button>
        </div>
      </Card>

      {/* Feature flags */}
      <Card tone="raised" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Icon name="settings" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Feature flags</h2>
            <p className="text-sm text-ink-500">Toggle platform features on or off.</p>
          </div>
        </div>
        <div className="grid gap-3">
          {[
            { label: "New user registrations", description: "Allow new users to create accounts", enabled: true },
            { label: "Couple profiles", description: "Enable couple profile creation", enabled: true },
            { label: "Messaging", description: "Allow users to send messages", enabled: true },
            { label: "Content uploads", description: "Allow users to upload photos and videos", enabled: false },
          ].map((flag) => (
            <div key={flag.label} className="flex items-center justify-between rounded-xl border border-ink-200 bg-surface-muted p-4">
              <div>
                <p className="text-sm font-medium text-ink-900">{flag.label}</p>
                <p className="text-xs text-ink-500">{flag.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={flag.enabled}
                className={`relative h-6 w-11 rounded-full transition ${flag.enabled ? "bg-brand-600" : "bg-ink-300"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${flag.enabled ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Support contacts */}
      <Card tone="raised" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Icon name="chat" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Support contacts</h2>
            <p className="text-sm text-ink-500">Public-facing support information.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Support email
            <input type="email" defaultValue="iremidetimmy398@gmail.com" className={inputClass} />
          </label>
          <label className={labelClass}>
            WhatsApp number
            <input type="tel" defaultValue="0807 556 6434" className={inputClass} />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm">Save contacts</Button>
        </div>
      </Card>
    </div>
  );
}