"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";

const inputClass = "mt-1 w-full rounded-xl border border-ink-700 bg-surface px-3 py-2 text-sm font-medium text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none";
const labelClass = "text-sm font-semibold text-white";

export default function AdminSettingsPage() {
  const [payPublic, setPayPublic] = useState("");
  const [paySecret, setPaySecret] = useState("");
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("iremidetimmy398@gmail.com");
  const [contactPhone, setContactPhone] = useState("0807 556 6434");
  const [contactMsg, setContactMsg] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({
    "New user registrations": true,
    "Couple profiles": true,
    Messaging: true,
    "Content uploads": false,
  });

  function savePayment(e: FormEvent) {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cc-pay-public", payPublic);
    }
    setPayMsg("Payment settings saved locally.");
  }

  function saveContacts(e: FormEvent) {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cc-support-email", contactEmail);
      window.localStorage.setItem("cc-support-phone", contactPhone);
    }
    setContactMsg("Support contacts saved locally.");
  }
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
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
            <Icon name="sparkle" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Subscription tiers</h2>
            <p className="text-sm text-ink-400">Configure pricing and features for each tier.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-ink-700 bg-surface-muted p-4">
            <h3 className="font-semibold text-white">Free</h3>
            <p className="mt-1 text-xs text-ink-400">Basic access</p>
            <p className="mt-2 text-2xl font-bold text-white">₦0<span className="text-sm font-normal text-ink-400">/mo</span></p>
          </div>
          <div className="rounded-xl border border-brand-500/50 bg-brand-500/10 p-4">
            <h3 className="font-semibold text-brand-200">Gold</h3>
            <p className="mt-1 text-xs text-ink-400">Premium features</p>
            <p className="mt-2 text-2xl font-bold text-brand-200">₦2,500<span className="text-sm font-normal text-ink-400">/mo</span></p>
          </div>
          <div className="rounded-xl border border-ink-600 bg-surface-muted p-4">
            <h3 className="font-semibold text-white">Platinum</h3>
            <p className="mt-1 text-xs text-ink-400">VIP access</p>
            <p className="mt-2 text-2xl font-bold text-white">₦5,000<span className="text-sm font-normal text-ink-400">/mo</span></p>
          </div>
        </div>
      </Card>

      {/* Payment gateway */}
      <Card tone="raised" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/15 text-success-300">
            <Icon name="lock" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Payment gateway</h2>
            <p className="text-sm text-ink-400">Configure your payment provider settings.</p>
          </div>
        </div>
        <form onSubmit={savePayment}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Paystack public key
            <input type="text" value={payPublic} onChange={(e) => setPayPublic(e.target.value)} placeholder="pk_live_..." className={inputClass} />
          </label>
          <label className={labelClass}>
            Paystack secret key
            <input type="password" value={paySecret} onChange={(e) => setPaySecret(e.target.value)} placeholder="sk_live_..." className={inputClass} />
          </label>
        </div>
        {payMsg ? <p role="status" className="mt-3 text-sm font-semibold text-success-300">{payMsg}</p> : null}
        <div className="mt-4 flex justify-end">
          <Button size="sm" type="submit">Save payment settings</Button>
        </div>
        </form>
      </Card>

      {/* Feature flags */}
      <Card tone="raised" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
            <Icon name="settings" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Feature flags</h2>
            <p className="text-sm text-ink-400">Toggle platform features on or off.</p>
          </div>
        </div>
        <div className="grid gap-3">
          {[
            { label: "New user registrations", description: "Allow new users to create accounts" },
            { label: "Couple profiles", description: "Enable couple profile creation" },
            { label: "Messaging", description: "Allow users to send messages" },
            { label: "Content uploads", description: "Allow users to upload photos and videos" },
          ].map((flag) => {
            const enabled = flags[flag.label] ?? false;
            return (
            <div key={flag.label} className="flex items-center justify-between rounded-xl border border-ink-700 bg-surface-muted p-4">
              <div>
                <p className="text-sm font-semibold text-white">{flag.label}</p>
                <p className="mt-0.5 text-xs font-medium text-ink-300">{flag.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={flag.label}
                onClick={() => setFlags((p) => ({ ...p, [flag.label]: !enabled }))}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-brand-600" : "bg-white/20"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white/5 shadow transition ${enabled ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            );
          })}
        </div>
      </Card>

      {/* Support contacts */}
      <Card tone="raised" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
            <Icon name="chat" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Support contacts</h2>
            <p className="text-sm text-ink-400">Public-facing support information.</p>
          </div>
        </div>
        <form onSubmit={saveContacts}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Support email
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            WhatsApp number
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
          </label>
        </div>
        {contactMsg ? <p role="status" className="mt-3 text-sm font-semibold text-success-300">{contactMsg}</p> : null}
        <div className="mt-4 flex justify-end">
          <Button size="sm" type="submit">Save contacts</Button>
        </div>
        </form>
      </Card>
    </div>
  );
}