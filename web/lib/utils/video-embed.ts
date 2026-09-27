/**
 * Video-link embeds for moments.
 *
 * SECURITY: every value here ends up as an iframe `src`, so the URL is the one
 * piece of untrusted input in the moment that can point the browser somewhere
 * unexpected. It is therefore NEVER passed through unchecked, and the host
 * allowlist below is the enforcement - not a suggestion, and not something the
 * client can widen.
 *
 * Only `https` and only known video hosts are accepted. An arbitrary URL would
 * let a member frame any origin inside the app's chrome, which is the basis of
 * clickjacking and of driving the member's own session through a hostile frame.
 */

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "instagram.com",
  "www.instagram.com",
]);

/** Longest URL accepted, to bound what can be stored and rendered. */
const MAX_URL_LENGTH = 2048;

export interface ParsedEmbed {
  ok: true;
  /** Canonical, privacy-preserving embed URL to put in the iframe `src`. */
  embedUrl: string;
  /** A thumbnail, when the host publishes an obvious one. */
  thumbnailUrl: string | null;
  provider: "youtube" | "tiktok" | "instagram";
}

export type ParsedEmbedResult = ParsedEmbed | { ok: false; error: string };

function hostIs(host: string, base: string): boolean {
  return host === base || host.endsWith(`.${base}`);
}

/**
 * Parse and validate a pasted video link.
 *
 * Returns a *derived* embed URL rather than echoing the member's input back, so
 * a hostile host can never reach the iframe even if this check is later relaxed
 * by mistake: the output is built from the extracted video id alone.
 */
export function parseVideoEmbedUrl(raw: string): ParsedEmbedResult {
  const input = (raw ?? "").trim();
  if (!input) return { ok: false, error: "Paste a video link." };
  if (input.length > MAX_URL_LENGTH) {
    return { ok: false, error: "That link is too long." };
  }

  let url: URL;
  try {
    // Bare hostnames like "youtu.be/abc" are common when pasting, so prepend
    // https:// rather than rejecting a link the member clearly meant.
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return { ok: false, error: "That doesn't look like a valid link." };
  }

  if (url.protocol !== "https:") {
    return {
      ok: false,
      error: "Only https:// links are supported.",
    };
  }

  const host = url.hostname.toLowerCase();

  // `youtu.be` is a SEPARATE registrable domain, so `hostIs(host, "youtube.com")`
  // is false for it. It has to be matched explicitly - a test caught this: the
  // short share form is by far the most common way a member pastes a YouTube
  // link, and it was being rejected outright.
  if (
    hostIs(host, "youtube.com") ||
    hostIs(host, "youtube-nocookie.com") ||
    host === "youtu.be"
  ) {
    // Accept the watch URL, the /shorts/ URL and the bare youtu.be short form.
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : url.searchParams.get("v") ??
          (url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] ?? "");
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
      return { ok: false, error: "That YouTube link has no video id." };
    }
    return {
      ok: true,
      // youtube-nocookie does not write tracking cookies until playback.
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      provider: "youtube",
    };
  }

  if (hostIs(host, "tiktok.com")) {
    // /@user/video/1234567890
    const match = url.pathname.match(/^\/@[^/]+\/video\/(\d{6,25})/);
    if (!match) {
      return {
        ok: false,
        error: "Paste a TikTok video link, not a profile link.",
      };
    }
    // TikTok's own embed endpoint is the only documented way to frame a clip.
    return {
      ok: true,
      embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`,
      thumbnailUrl: null,
      provider: "tiktok",
    };
  }

  if (hostIs(host, "instagram.com")) {
    // /reel/<shortcode>/ or /p/<shortcode>/
    const match = url.pathname.match(/^\/(?:reel|p|reels|tv)\/([A-Za-z0-9_-]{5,40})/);
    if (!match) {
      return {
        ok: false,
        error: "Paste an Instagram reel or post link.",
      };
    }
    // Instagram deliberately has no open embed endpoint, so the post page is
    // framed instead. The app shows a poster + tap-to-load fallback if the
    // site refuses to be framed (see the embed renderer in MediaFeed).
    return {
      ok: true,
      embedUrl: `https://www.instagram.com/p/${match[1]}/embed`,
      thumbnailUrl: `https://www.instagram.com/p/${match[1]}/media/?size=l`,
      provider: "instagram",
    };
  }

  return {
    ok: false,
    error: "Only YouTube, TikTok and Instagram links are supported.",
  };
}
