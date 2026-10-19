import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfile, listProfilePhotos } from "@/lib/server/profiles";
import { PersonalInfoManager } from "@/components/profile/PersonalInfoManager";

export default async function PersonalInfoPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const { user, profile } = await getOwnProfile(session.uid);
  const photos = await listProfilePhotos(session.uid);

  return (
    <PersonalInfoManager
      uid={session.uid}
      profile={profile}
      photos={photos}
    />
  );
}