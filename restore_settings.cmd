@echo off
echo Writing settings page...
copy con "c:\Users\HomePC\Documents\couple's conner\web-admin\app\admin\settings\page.tsx" >nul
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

const inputClass = "mt-1 w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none";
const labelClass = "text-sm font-medium text-ink-800";

export default function AdminSettingsPage() {
  return (
    <ErrorBoundary feature="Settings">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Settings"
          title="Platform configuration"
          subtitle="Manage global platform settings, subscription tiers, and feature flags."
        />
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
        </Card>
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
        </Card>
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
        </Card>
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
        </Card>
      </div>
    </ErrorBoundary>
  );
}
^Z
echo Settings page restored