"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import {
  getPlatformSettingsAction,
  savePaymentSettingsAction,
} from "@/lib/actions/settings";

const inputClass =
  "mt-1 w-full rounded-xl border border-orange-500/30 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40";
const labelClass = "flex flex-col text-sm font-medium text-slate-200";

const tiers = [
  { name: "Weekly", price: "$6", period: "per week", features: "Full access, cancel anytime", border: "border-orange-500/30" },
  { name: "Monthly", price: "$19", period: "per month", features: "Best value for regular users", border: "border-orange-500 ring-2 ring-orange-500/20" },
  { name: "Yearly", price: "$55", period: "per year", features: "Best deal — save vs monthly", border: "border-orange-500/30" },
];

interface Feedback {
  type: "success" | "error";
  msg: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [paystackPublicKey, setPaystackPublicKey] = useState("");
  const [paystackSecretKey, setPaystackSecretKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let mounted = true;
    getPlatformSettingsAction()
      .then((s) => {
        if (!mounted) return;
        setPaystackPublicKey(s.paystackPublicKey ?? "");
        setPaystackSecretKey(s.paystackSecretKey ?? "");
      })
      .catch((err) => {
        if (mounted) {
          setFeedback({
            type: "error",
            msg: err instanceof Error ? err.message : "Failed to load payment settings.",
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await savePaymentSettingsAction(paystackPublicKey, paystackSecretKey);
      if (res.ok) {
        setFeedback({ type: "success", msg: "Payment settings saved successfully." });
        router.refresh();
      } else {
        setFeedback({ type: "error", msg: res.error ?? "Failed to save payment settings." });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to save payment settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (

    <div className="flex min-w-0 flex-col gap-8">
      <PageHeader
        eyebrow="Settings"
        title="Platform configuration"
        subtitle="Manage global platform settings, VIP Membership tiers, and feature flags."
      />

      {/* Subscription tiers */}
      <section className="min-w-0 rounded-2xl border border-orange-500/20 bg-slate-900 p-6 shadow-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
            <Icon name="sparkle" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">VIP Membership tiers</h2>
            <p className="text-sm text-slate-300">Configure pricing and features for each tier.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className={`min-w-0 rounded-xl border bg-slate-800 p-4 ${t.border}`}>
              <h3 className="font-semibold text-white">{t.name}</h3>
              <p className="mt-1 text-xs text-slate-400">{t.features}</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {t.price}
                <span className="text-sm font-normal text-slate-400"> {t.period}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Payment gateway */}
      <section className="min-w-0 rounded-2xl border border-orange-500/20 bg-slate-900 p-6 shadow-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-500/20 text-success-300">
            <Icon name="lock" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Payment gateway</h2>
            <p className="text-sm text-slate-300">Configure your payment provider settings.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Paystack public key
            <input
              type="text"
              autoComplete="off"
              value={paystackPublicKey}
              onChange={(e) => setPaystackPublicKey(e.target.value)}
              placeholder="pk_live_..."
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Paystack secret key
            <input
              type="password"
              autoComplete="new-password"
              value={paystackSecretKey}
              onChange={(e) => setPaystackSecretKey(e.target.value)}
              placeholder="sk_live_..."
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {feedback ? (
            <p
              role="status"
              className={`text-sm font-medium ${feedback.type === "success" ? "text-success-300" : "text-danger-300"}`}
            >
              {feedback.msg}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Values are stored server-side.</p>
          )}
          <Button
            size="sm"
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-orange-600 text-white hover:bg-orange-500"
          >
            {saving ? "Saving…" : "Save payment settings"}
          </Button>
        </div>
      </section>
    </div>
  );
}
