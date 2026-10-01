"use client";

/**
 * ChatSettingsSheet — the sheet behind the header's three-dot menu.
 *
 * Holds two personal display preferences: the chat theme (a preset token set)
 * and a custom wallpaper image. Both are per-device and neither is visible to
 * anyone else, which is why both live behind one "Chat settings" entry rather
 * than each getting a control of its own.
 *
 * ── WHY A SHEET AND NOT AN INLINE POPOVER ─────────────────────────────────────
 * The theme picker used to sit in the composer as a row of swatches. It worked,
 * but it occupied space above the input on EVERY conversation, for a preference
 * most members set once and never revisit. Here it is opt-in: three dots, sheet,
 * done. The composer keeps its Palette button, which opens this same sheet.
 *
 * ── WALLPAPER READABILITY IS THE WHOLE PROBLEM ────────────────────────────────
 * A photo behind a message thread is unreadable by default: message text is
 * small, mid-weight, and has no background of its own to sit on. Any wallpaper
 * bright enough to recognise is bright enough to destroy contrast.
 *
 * So the image is never the message background. It is painted as a layer UNDER
 * two scrims (see `ChatWallpaper`), and the scrim is what the text actually
 * reads against. A bright photo is therefore allowed — the worst case is a
 * slightly greyed picture, never an unreadable thread.
 */

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { CHAT_THEMES, type ChatThemeId } from "@/components/app/MessageComposer";
import { uploadFileDirect } from "@/lib/utils/direct-upload";
import { getSupabaseClient } from "@/lib/supabase/client";

const MAX_WALLPAPER_BYTES = 8 * 1024 * 1024;
export function ChatSettingsSheet({
  open,
  onClose,
  theme,
  onThemeChange,
  wallpaper,
  onWallpaperChange,
}: {
  open: boolean;
  onClose: () => void;
  theme: ChatThemeId;
  onThemeChange: (next: ChatThemeId) => void;
  wallpaper: string | null;
  onWallpaperChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape to dismiss. A keyboard user must be able to leave the sheet without
  // hunting back for the three-dot button they opened it from.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Render nothing rather than a hidden panel: the sheet holds a file input and
  // an upload, and leaving it mounted-but-invisible keeps those alive.
  if (!open) return null;

  async function pickWallpaper(file: File) {
    if (busy) return;
    setError(null);

    // Checked BEFORE upload so an oversized photo fails instantly instead of
    // after a slow cellular transfer that ends in a 413 nobody can explain.
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > MAX_WALLPAPER_BYTES) {
      setError("That image is over 8 MB. Pick a smaller one.");
      return;
    }

    setBusy(true);
    try {
      const { data: auth } = await getSupabaseClient().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setError("Please sign in again.");
        return;
      }
      /* No `recordUserMediaAction` here on purpose — a wallpaper is not a
         gallery item, and writing a user_media row per pick would grow the
         member's profile gallery every time they changed their background. */
      const result = await uploadFileDirect(uid, file);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onWallpaperChange(result.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that image.");
    } finally {
      setBusy(false);
    }
  }
return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Chat settings"
    >
      {/* Scrim. A real <button>, not a div with onClick: a click handler on a
          non-interactive element is unreachable by keyboard, and for many
          people this is the only visible way out of the sheet. */}
      <button
        type="button"
        aria-label="Close chat settings"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-slate-900 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" aria-hidden />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Chat settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* ── DIY CHAT THEMES ────────────────────────────────────────────── */}
        <section aria-labelledby="sheet-themes">
          <h3 id="sheet-themes" className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Chat theme
          </h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Chat theme">
            {CHAT_THEMES.map((option) => {
              const selected = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onThemeChange(option.id)}
                  className={[
                    "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-semibold transition",
                    selected
                      ? "border-orange-400/70 text-slate-100"
                      : "border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className="h-6 w-6 rounded-full ring-1 ring-black/40"
                    style={{ backgroundImage: option.swatch }}
                  />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── CUSTOM WALLPAPER ───────────────────────────────────────────── */}
        <section aria-labelledby="sheet-wallpaper" className="mt-5">
          <h3 id="sheet-wallpaper" className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Custom wallpaper
          </h3>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Choose a chat wallpaper"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset value so picking the SAME file twice in a row still fires
              // onChange — otherwise the second selection is silently ignored.
              e.target.value = "";
              if (file) void pickWallpaper(file);
            }}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-60"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              {busy ? "Uploading…" : wallpaper ? "Change photo" : "Choose photo"}
            </button>

            {wallpaper ? (
              <button
                type="button"
                onClick={() => onWallpaperChange(null)}
                aria-label="Remove wallpaper"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          <p className="mt-2 text-xs text-slate-500">
            Your photo is darkened behind the thread so messages stay readable, and
            stays on this device only.
          </p>
        </section>
      </div>
    </div>
  );
}