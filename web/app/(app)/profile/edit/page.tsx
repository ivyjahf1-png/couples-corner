import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfileAction } from "@/lib/actions/profile";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function ProfileEditPage() {
  const session = await getSessionUser();
  // requireUser guards at the layout level, but be explicit in the page too.
  if (!session) {
    return null;
  }

  const { user, profile } = await getOwnProfileAction(session.uid);
  const initial = profile ?? ({} as never);

  return (
    <ProfileForm
      uid={session.uid}
      mode="edit"
      initialData={{ ...initial, user }}
    />
  );
}
