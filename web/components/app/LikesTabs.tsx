"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/landing/Icon";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/EmptyState";
import type { LikeView, PostLikeView } from "@/lib/likes-types";

/**
 * Likes — two distinct kinds of appreciation, split into tabs.
 *
 * WHY A CLIENT COMPONENT: the tab switch needs local state. It is fed plain
 * serialisable view models by the server page, so no data access happens here
 * and the `server-only` boundary in lib/server/likes.ts is never crossed.
 *
 * WHY TABS AND NOT ONE SCROLLING PAGE: a member with 200 profile likes and 3
 * post likes would otherwise scroll past all 200 cards to reach the engagement
 * data they came for.
 */
export function LikesTabs({
  profileLikes,
  postLikes,
}: {
  profileLikes: LikeView[];
  postLikes: PostLikeView[];
}) {
  const [tab, setTab] = useState<"profile" | "posts">("profile");
  const profileCount = profileLikes.length;
  const postCount = postLikes.length;
  const counts = useMemo(
    () => ({ profile: profileCount, posts: postCount }),
    [profileCount, postCount]
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Like activity"
        className="flex gap-2 rounded-2xl border border-white/10 bg-[#0F172A] p-1"
      >
        <TabButton
          active={tab === "profile"}
          onClick={() => setTab("profile")}
          icon="heart"
          label="Profile"
          count={counts.profile}
        />
        <TabButton
          active={tab === "posts"}
          onClick={() => setTab("posts")}
          icon="moments"
          label="Posts"
          count={counts.posts}
        />
      </div>

      {tab === "profile" ? (
        <ProfileLikes likes={profileLikes} />
      ) : (
        <PostLikes likes={postLikes} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: "heart" | "moments";
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-brand-500/20 text-white ring-1 ring-brand-500/40"
          : "text-ink-400 hover:text-white",
      ].join(" ")}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
      {count > 0 ? (
        <span className="rounded-full bg-white/10 px-1.5 text-xs tabular-nums text-ink-300">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function ProfileLikes({ likes }: { likes: LikeView[] }) {
  const valid = likes.filter((l) => l?.id);
  if (valid.length === 0) {
    return (
      <EmptyState
        icon="heart"
        title="No likes yet"
        body="When someone likes your profile, their card appears here. Keep your photos and bio fresh — profiles with photos get more likes."
        action={<Button href="/discover">Find people</Button>}
      />
    );
  }
  return (
    <section
      aria-label="People who liked you"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
    >
      {valid.map((like) => (
        <LikeCard key={like.id} like={like} />
      ))}
    </section>
  );
}


/**
 * Post likes: "Sarah liked your video".
 *
 * The whole row is one link to `/?moment=<id>`, which MediaFeed now reads to
 * scroll to that exact moment. Whole-row-as-link (rather than a small "view"
 * affordance) matches the IG/TikTok activity pattern and avoids a tap target
 * the size of a thumbnail.
 */
function PostLikes({ likes }: { likes: PostLikeView[] }) {
  const valid = likes.filter((l) => l?.id);
  if (valid.length === 0) {
    return (
      <EmptyState
        icon="heart"
        title="No post likes yet"
        body="When someone likes a photo or video you've posted, it shows up here. Share a moment to get your first like."
        action={<Button href="/discover">See who's posting</Button>}
      />
    );
  }
  return (
    <section aria-label="Likes on your posts" className="flex flex-col gap-3">
      {valid.map((like) => (
        <PostLikeRow key={like.id} like={like} />
      ))}
    </section>
  );
}

const REACTION_COPY: Record<string, string> = {
  like: "liked",
  love: "loved",
  fire: "is hyped about",
  laugh: "found funny",
};

function PostLikeRow({ like }: { like: PostLikeView }) {
  const name = like.likerName?.trim() || "Someone";
  // Falls back to "liked" so an unrecognised reaction kind never renders a blank
  // verb ("  your video").
  const verb = REACTION_COPY[like.kind ?? "like"] ?? "liked";
  const isVideo = like.momentMediaType === "video";
  const target = like.momentId
    ? `/?moment=${encodeURIComponent(like.momentId)}`
    : null;

  const avatar = like.likerAvatarUrl ? (
    <img
      src={like.likerAvatarUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-10 w-10 shrink-0 rounded-full object-cover"
    />
  ) : (
    <Avatar name={name} kind="person" size="md" />
  );

  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{name}</span>
        <span className="mt-0.5 block text-sm text-ink-300">
          {verb} your{" "}
          {isVideo ? "video" : like.momentMediaType === "image" ? "photo" : "post"}
        </span>
        {like.at ? (
          <span className="mt-1 block text-xs text-ink-500">{formatWhen(like.at)}</span>
        ) : null}
      </span>

      {like.momentMediaUrl ? (
        isVideo ? (
          // Deliberately NOT a <video> thumbnail: each one would start buffering
          // a second copy of the feed's media, which is the exact memory problem
          // MediaFeed works to avoid. The play glyph previews it instead, and the
          // tap-through loads the real thing.
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#1E293B]">
            <Icon name="moments" className="h-5 w-5 text-white/70" />
          </span>
        ) : (
          <img
            src={like.momentMediaUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover"
          />
        )
      ) : null}
    </>
  );

  const rowClass =
    "flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1E293B] p-3";

  // Deleted media: still credit the liker, but do not offer a link that would
  // land nowhere.
  if (!target) {
    return (
      <div className={rowClass}>
        {avatar}
        {body}
      </div>
    );
  }

  return (
    <a href={target} className={`${rowClass} transition hover:border-white/20`}>
      {avatar}
      {body}
    </a>
  );
}

function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}
function LikeCard({ like }: { like: LikeView | null | undefined }) {
  // Strict optional chaining â€” a malformed like row renders a soft fallback.
  if (!like) return null;
  const name = like.name?.trim() || "Someone special";
  const blurred = Boolean(like.isBlurred);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-4 shadow-card">
      <div className="relative mx-auto h-20 w-20">
        {like.avatarUrl ? (
          <img
            src={like.avatarUrl}
            alt={blurred ? "Hidden profile" : name}
            className={["h-20 w-20 rounded-full object-cover ring-2 ring-brand-500/30", blurred ? "blur-md" : ""].join(" ")}
          />
        ) : (
          <div className={blurred ? "blur-md" : ""}>
            <Avatar name={name} kind={like.kind} size="xl" className="bg-gradient-to-br from-brand-500/25 via-brand-600/10 to-ink-700/40 ring-1 ring-white/10" />
          </div>
        )}
        {blurred ? (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A]/80 text-orange-300">
              <Icon name="lock" className="h-4 w-4" />
            </span>
          </span>
        ) : null}
      </div>

      <div className="text-center">
        <p className={["truncate font-semibold text-white", blurred ? "blur-[6px] select-none" : ""].join(" ")} aria-hidden={blurred || undefined}>
          {blurred ? "Hidden profile" : name}
        </p>
        <p className={["truncate text-xs text-ink-400", blurred ? "blur-[6px] select-none" : ""].join(" ")}>
          {like.location?.trim() || "Location not shared"}
        </p>
      </div>

      {blurred ? (
        <Button size="sm" variant="secondary" href="/subscription" className="w-full">
          Unlock with VIP
        </Button>
      ) : (
        <Button size="sm" variant="secondary" href={`/messages`} className="w-full">
          Say hi
        </Button>
      )}
    </article>
  );
}

