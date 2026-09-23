import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfile } from "@/lib/server/profiles";
import { SUBSCRIPTION_PLANS } from "@/lib/models/subscription";
import { getActiveSubscription, getMembership } from "@/lib/server/subscription";
import { emptyWallet, type WalletView } from "@/lib/models/wallet";
import { WalletMenu } from "@/components/app/WalletMenu";

export const dynamic = "force-dynamic";

function formatPrice(usd: number): string {
  return `$${usd}`;
}

function formatSavings(monthly: number, planPrice: number, planDays: number): string | null {
  const monthlyCost = (monthly / 30) * planDays;
  if (monthlyCost <= planPrice) return null;
  const pct = Math.round(((monthlyCost - planPrice) / monthlyCost) * 100);
  return `Save ${pct}%`;
}

export default async function SubscriptionPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const { profile } = await getOwnProfile(session.uid);
  const activeSub = await getActiveSubscription(session.uid);
  const activePlan = activeSub ? SUBSCRIPTION_PLANS.find((p) => p.tier === activeSub.tier) : null;

  // Wallet + tier details live here (relocated from the Home page).
  let membership: WalletView = emptyWallet();
  try {
    membership = await getMembership(session.uid);
  } catch {
    membership = emptyWallet();
  }

  const monthlyPrice = SUBSCRIPTION_PLANS.find((p) => p.tier === "monthly")!.priceUsd;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="VIP Membership"
        title="Choose your plan"
        subtitle="Unlock premium features and get the most out of Couples Corner."
      />

      {/* Wallet — tier badge, coin balance and the purchase/upgrade drawer. */}
      <section aria-label="Your wallet and tier">
        <WalletMenu initial={membership} variant="card" />
      </section>

      {activePlan ? (
        <Card tone="muted" className="border border-success-500/40 bg-success-500/10">
          <div className="flex items-center gap-3">
            <Icon name="sparkle" className="h-5 w-5 text-success-300" />
            <div>
              <p className="text-sm font-medium text-success-200">
                You are currently on the <strong>{activePlan.name}</strong> plan.
              </p>
              <p className="text-xs text-success-300">
                Renews on {new Date(activeSub!.currentPeriodEnd).toLocaleDateString()}.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const savings = plan.tier !== "weekly" ? formatSavings(monthlyPrice, plan.priceUsd, plan.durationDays) : null;
          const isActive = activePlan?.id === plan.id;
          return (
            <Card
              key={plan.id}
              tone={plan.recommended ? "raised" : undefined}
              className={[
                "relative flex flex-col p-6",
                plan.recommended ? "border-orange-500 ring-2 ring-orange-500/20" : "",
                isActive ? "ring-2 ring-success-400" : "",
              ].join(" ")}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-ink-300">{plan.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">{formatPrice(plan.priceUsd)}</span>
                <span className="text-sm text-ink-400">
                  /{plan.durationDays === 7 ? "wk" : plan.durationDays === 30 ? "mo" : "yr"}
                </span>
                {savings && (
                  <span className="ml-2 rounded-full bg-success-500/15 px-2 py-0.5 text-xs font-medium text-success-300">
                    {savings}
                  </span>
                )}
              </div>
              <ul className="mt-6 flex flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-200">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button
                  fullWidth
                  variant={isActive ? "secondary" : plan.recommended ? "primary" : "secondary"}
                  disabled={isActive}
                >
                  {isActive ? "Current plan" : "Get VIP Membership"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card tone="muted" className="text-center">
        <p className="text-sm text-ink-300">
          All plans include a 3-day free trial. Cancel anytime. No hidden fees.
        </p>
      </Card>
    </div>
  );
}
