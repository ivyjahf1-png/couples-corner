import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

/**
 * Onboarding route — shown once after registration.
 *
 * Redirects to the dashboard if onboarding is already complete.
 * The actual multi-step form is a client component so it can manage
 * local step state and file uploads.
 */
export default async function OnboardingPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");

  // Skip onboarding if already completed
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data: userRecord } = await supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", session.uid)
      .single();

    if (userRecord?.onboarding_completed) {
      redirect("/dashboard");
    }
  }

  return <OnboardingFlow uid={session.uid} email={session.email} />;
}