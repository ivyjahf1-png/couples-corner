import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfile } from "@/lib/server/profiles";
import { ProfileForm } from "@/components/profile/ProfileForm";

/**
 * First-time profile setup after registration. Existing profiles pre-fill the
 * form (edit pre-filled); brand-new accounts start from a clean create flow.
 */
export default async function ProfileSetupPage() {
  const session = await getSessionUser();
  if (!session) return null; // requireUser() at layout level redirects.

  const { user, profile } = await getOwnProfile(session.uid);
  const hasProfile = Boolean(profile && (profile.displayName || profile.bio));

  return (
    <ProfileForm
      uid={session.uid}
      mode={hasProfile ? "edit" : "create"}
      initialData={{ ...(profile ?? {}), user }}
    />
  );
}