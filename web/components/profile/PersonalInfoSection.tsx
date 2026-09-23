import Link from "next/link";
import { Icon } from "@/components/landing/Icon";
import { Avatar } from "@/components/app/Avatar";
import { Chip } from "@/components/ui/Chip";

/**
 * PersonalInformationSection — the SOYO-style "Personal information" editor
 * view rendered on /profile/edit beneath the main ProfileForm.
 *
 * Presentational by design: it renders every required block (album grid,
 * voice card, certification banner, hobbies, signature/about, basic info,
 * "More about me" checklist) and routes interactive intent to the real
 * editors — the photo uploader, the hobby picker and the ProfileForm fields —
 * so nothing here forks the save path or duplicates a bound input.
 */

export interface PersonalInfoData {
  name: string;
  birthday: string;
  country: string;
  flag: string;
  signature: string;
  aboutMe: string;
  hobbies: string[];
  photos: { url: string }[];
  certified: boolean;
}

const HOBBY_PRESETS = ["Writing", "Singing", "Art", "Design", "Dancing"];

const MORE_ABOUT_ME = [
  "Exercise",
  "Education",
  "Smoking",
  "Liquor",
  "Superpower",
  "Pets",
  "Personality type",
  "Horoscopes",
];

export function PersonalInformationSection({ data }: { data: PersonalInfoData }) {
  const slots: ({ url: string } | null)[] = [...data.photos.slice(0, 8)];
  while (slots.length < 8) slots.push(null);

  return (
    <section aria-labelledby="personal-info-heading" className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 id="personal-info-heading" className="text-base font-semibold text-white">
          Personal information
        </h2>
      </div>

      {/* My album */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">My album</h3>
          <span className="text-xs text-ink-400">{data.photos.length}/8</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {slots.map((photo, i) =>
            photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={photo.url} alt={`Album photo ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />
            ) : (
              <span key={i} aria-hidden className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-ink-400">
                <Icon name="plus" className="h-5 w-5" />
              </span>
            )
          )}
        </div>
      </div>

      {/* Voice card */}
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#1E293B] to-[#0F172A] p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-300" aria-hidden="true">
          <Icon name="chat" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Add voice signature</p>
          <p className="text-xs text-ink-300">Add voice signature to increase attention by 900%</p>
        </div>
        <span className="ml-auto rounded-full bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-300">Add</span>
      </div>

      {/* Certification banner */}
      {data.certified ? (
        <div className="flex items-center gap-3 rounded-2xl border border-success-500/30 bg-success-500/10 p-4" role="status">
          <Icon name="check" className="h-5 w-5 text-success-400" />
          <p className="text-sm text-success-300">Identity certified — your profile is verified.</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-success-500/30 bg-success-500/10 p-4" role="status">
          <Icon name="shield" className="h-5 w-5 text-success-400" />
          <p className="text-sm text-success-300">Identity is not certified — certify now to build trust.</p>
        </div>
      )}

      {/* My hobbies */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-white">My hobbies</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {HOBBY_PRESETS.map((hobby) => {
            const active = data.hobbies.includes(hobby);
            return (
              <li key={hobby}>
                <Chip tone={active ? "brand" : "neutral"}>{hobby}</Chip>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-ink-400">Edit hobbies in the interest picker above.</p>
      </div>

      {/* Signature + About me */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Signature</h3>
          <p className="mt-1 text-sm text-ink-300">{data.signature || "Add a short signature to stand out."}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">About me</h3>
          <p className="mt-1 text-sm text-ink-300">{data.aboutMe || "Introduce yourself — what makes you, you?"}</p>
        </div>
        <p className="text-xs text-ink-400">Edit these in the form above.</p>
      </div>

      {/* My basic information */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-white">My basic information</h3>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-400">Name</dt>
            <dd className="text-sm font-medium text-white">{data.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-400">Birthday</dt>
            <dd className="text-sm font-medium text-white">{data.birthday || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-400">Country</dt>
            <dd className="text-sm font-medium text-white">
              <span aria-hidden="true">{data.flag}</span> {data.country || "Not set"}
            </dd>
          </div>
        </dl>
      </div>

      {/* More about me checklist */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-white">More about me</h3>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MORE_ABOUT_ME.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
            >
              <span className="text-sm text-ink-200">{item}</span>
              <span className="rounded-full bg-orange-500/15 px-3 py-0.5 text-xs font-semibold text-orange-300">Add</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}