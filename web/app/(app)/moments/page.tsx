import Link from "next/link";
import { requireUser } from "../../../lib/auth/authorization";
import { getOwnProfile } from "../../../lib/server/profiles";
import { getRecentMoments } from "../../../lib/server/tasks";
import type { MomentView } from "../../../lib/moments";
import { MomentCard } from "../../../components/app/MomentCard";
import { MomentsUploadFab } from "../../../components/app/MomentsUploadFab";

export default async function MomentsPage() {
  const session = await requireUser();
  const result = await getOwnProfile(session.uid).catch(() => null);
  const userProfile = result?.profile ?? null;
  const user = result?.user ?? null;

  const avatarUrl = userProfile?.photos?.[0]?.publicUrl ?? user?.avatarUrl ?? "/icon.png";
  const displayName = userProfile?.displayName ?? user?.displayName ?? "You";

  const rawMoments = (await getRecentMoments(120, session.uid).catch(
    () => [] as MomentView[]
  )) as MomentView[];
  const videos = rawMoments.filter((moment) => moment.mediaType === "video");
  const featured = videos[0];
  const otherVideos = videos.slice(1);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col pb-[calc(7rem+_env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3 px-4 py-4">
        <img
          src={avatarUrl}
          alt="avatar"
          className="h-10 w-10 rounded-full object-cover"
        />
        <span className="font-semibold">{displayName}</span>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 pt-3">
        <h1 className="text-2xl font-bold">Welcome to Moments</h1>

        {featured ? (
          <div className="rounded-2xl bg-gradient-to-b from-[#2a1a40] to-[#1f1a32] p-4">
            <Link
              href={`/moments/view?moment=${featured.id}`}
              className="block"
              aria-label={`Open featured moment by ${displayName}`}
            >
              <MomentCard post={featured} />
            </Link>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border border-white/20 bg-white/5 p-6 text-center text-sm text-white/60">
            No featured moment yet. Tap the + button below to upload your first video.
          </div>
        )}

        <section className="flex-1 flex-col gap-3">
          <h2 className="text-lg font-semibold">Goal-driven dating</h2>

          {videos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              No video moments yet. Add one with the + button below.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {otherVideos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-2xl bg-gradient-to-b from-[#2a1a40] to-[#1f1a32] p-4"
                >
                  <Link
                    href={`/moments/view?moment=${video.id}`}
                    className="block cursor-pointer"
                  >
                    <MomentCard post={video} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <MomentsUploadFab />
    </div>
  );
}
