import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfileAction } from "@/lib/actions/profile";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { PersonalInformationSection, type PersonalInfoData } from "@/components/profile/PersonalInfoSection";

/** Tiny flag lookup for the basic-info card (extends as needed). */
const FLAGS: Record<string, string> = {
  Nigeria: "🇳🇬",
  Ghana: "🇬🇭",
  Kenya: "🇰🇪",
  "South Africa": "🇿🇦",
  "United States": "🇺🇸",
  "United Kingdom": "🇬🇧",
};

export default async function ProfileEditPage() {
  const session = await getSessionUser();
  // requireUser guards at the layout level, but be explicit in the page too.
  if (!session) {
    return null;
  }

  const { user, profile } = await getOwnProfileAction(session.uid);
  const initial = profile ?? ({} as never);

  const photos = (initial.photos ?? []) as { publicUrl?: string | null }[];
  const album = photos
    .map((p) => p?.publicUrl)
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ url }));

  const meta = initial as unknown as Record<string, unknown>;
  const country = (initial.country as string | null) ?? (initial.location as string | null) ?? "";
  const personalInfo: PersonalInfoData = {
    name: (initial.displayName as string | null) ?? (user?.displayName as string | null) ?? "Member",
    birthday: (initial.dateOfBirth as string | null) ?? "",
    country,
    flag: FLAGS[country] ?? "🌍",
    signature: (meta.signature as string | null) ?? (initial.bio as string | null) ?? "",
    aboutMe: (meta.aboutMe as string | null) ?? (initial.bio as string | null) ?? "",
    hobbies: ((initial.interests as string[] | null) ?? []).slice(0, 6),
    photos: album,
    certified: Boolean(meta.isVerified),
  };

  return (
    <div className="flex flex-col gap-8">
      <ProfileForm
        uid={session.uid}
        mode="edit"
        initialData={{ ...initial, user }}
      />
      <PersonalInformationSection data={personalInfo} />
    </div>
  );
}
