"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "web", "components", "app", "PostCard.tsx");

// Builds the replacement media section. Every `${...}`, backtick and backslash that
// must appear literally in the emitted TSX is escaped (\${}, \`, \\), so nothing is
// interpolated in this script's own scope (which would throw ReferenceError).
function buildNewSection() {
  return `      {post.mediaUrls?.length ? (
        <div className="w-full overflow-hidden bg-black">
          {post.mediaUrls.slice(0, 4).map((url, i) => {
            // Skeleton: show placeholder while first load happens.
            if (mediaLoading[url] && !brokenMedia.includes(url)) {
              return (
                <div
                  key={\`\${url}-\${i}\`}
                  className="flex aspect-[4/5] w-full animate-pulse items-center justify-center bg-surface-muted"
                >
                  <span className="text-[11px] text-ink-400">Loading…</span>
                </div>
              );
            }
            if (brokenMedia.includes(url)) {
              return (
                <div
                  key={\`\${url}-\${i}\`}
                  className="flex aspect-[4/5] w-full items-center justify-center bg-surface-muted text-[11px] text-ink-400"
                >
                  Photo unavailable
                </div>
              );
            }
            return url.match(/\\.(mp4|webm|mov)(\\?.*)?$/i) ? (
              <video
                key={\`\${url}-\${i}\`}
                src={url}
                controls
                playsInline
                className="aspect-[4/5] w-full bg-black object-cover"
              />
            ) : (
              <img
                key={\`\${url}-\${i}\`}
                src={url}
                alt={post.body ? \`Photo by \${post.authorName}\` : \`Photo \${i + 1}\`}
                loading="lazy"
                decoding="async"
                onError={() => setBrokenMedia((current) => (current.includes(url) ? current : [...current, url]))}
                className="aspect-[4/5] w-full bg-surface-muted object-cover"
                onLoad={() => setMediaLoading((current) => {
                  const next = { ...current };
                  delete next[url];
                  return next;
                })}
              />
            );
          })}
        </div>
      ) : post.mediaCount ? (
        <div className="mx-4 mb-3 flex aspect-video items-center justify-center rounded-xl bg-surface-muted text-xs text-ink-400">Creator media preview</div>
      ) : null}
`.replace(/\n/g, "\r\n");
}

function apply() {
  const s = fs.readFileSync(FILE, "utf8");

  // Find the mediaUrls section
  const idx = s.indexOf("post.mediaUrls?.length");
  if (idx === -1) {
    console.error("Not found");
    return false;
  }

  // Get the complete section to replace
  const start = Math.max(0, idx - 50);
  const end = Math.min(s.length, idx + 1000);
  const result = s.substring(0, start) + buildNewSection() + s.substring(end);
  fs.writeFileSync(FILE, result);
  console.log("Done");
  return true;
}

if (require.main === module) {
  apply();
}

module.exports = { buildNewSection, apply, FILE };

