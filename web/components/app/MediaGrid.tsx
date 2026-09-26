"use client";

import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export type GalleryMedia = { id: string; storage_path: string; media_type: string };

/**
 * Shared thumbnail grid for the profile media sections.
 *
 * DESIGN CONTRACT (both the owner and public galleries render through this so
 * a profile looks identical whoever is viewing it):
 *   • Uniform square tiles via `aspect-square`, so a 4:5 phone snap and a 16:9
 *     clip occupy the same box and the grid never goes ragged.
 *   • `object-cover` on every tile. Videos previously used `object-contain`,
 *     which letterboxed each clip into a small centred strip and read as broken
 *     next to the full-bleed photos. Cover crops instead, which is what a
 *     thumbnail row is for; the untouched file is one tap away.
 *   • Videos are non-interactive previews (`pointer-events-none`, no `controls`)
 *     with a centred play glyph. Real controls inside a 100px tile are unusable
 *     and broke the grid, so the whole tile is the tap target that opens the
 *     original instead.
 *   • The per-item "Open original" caption row is gone. It repeated on every
 *     card and was pure clutter at thumbnail size; the tile itself is the link.
 */
export function MediaGrid({
  items,
  alt,
  children,
}: {
  items: GalleryMedia[];
  alt: string;
  /** Per-tile overlay, rendered above the media. Only the owner passes this. */
  children?: (item: GalleryMedia) => ReactNode;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      {items.map((item) => {
        const url = getSupabaseClient()
          .storage.from("user-media")
          .getPublicUrl(item.storage_path).data.publicUrl;
        const isVideo = item.media_type === "video";
        return (
          <li key={item.id} className="group relative">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 transition hover:ring-orange-400/50"
            >
              <span className="relative block aspect-square w-full">
                {isVideo ? (
                  <video
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    muted
                    playsInline
                    preload="metadata"
                    src={url}
                    className="pointer-events-none h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    loading="lazy"
                    src={url}
                    alt={alt}
                    className="h-full w-full object-cover"
                  />
                )}
                {isVideo ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                      <Play className="h-4 w-4 translate-x-px fill-white text-white" />
                    </span>
                  </span>
                ) : null}
              </span>
            </a>
            {children ? children(item) : null}
          </li>
        );
      })}
    </ul>
  );
}
