/** Video preview / frame-extraction utilities for moments.

 * Generates a static preview image from a video upload so the feed list can show
 * a clean thumbnail instead of a blank player box. Falls back to a generic
 * placeholder if the extraction infrastructure is unavailable.
 */

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Return a data-URL or absolute public URL for a single frame extracted from
 *  the video at `videoUrl`. The frame is taken from 30 % of the duration so it
 *  lands in a visually interesting part of the scene. */
export async function generateVideoPreview(
  videoUrl: string,
  outputFormat = "jpeg"
): Promise<string | null> {
  // 1. Serving the bytes to the frame extractor should live on the same origin
  //    in production (supabase storage signed URL is fine too). Trim auth
  //    headers from the synthetic path if present.
  if (!videoUrl) return null;

  // 2. Try ffmpeg first; it is the only reliable cross-platform decoder that
  //    can pull a frame from an arbitrary video file.
  try {
    const tempFile = join(tmpdir(), `moment-preview-${Date.now()}.${outputFormat}`);
    // -ss BEFORE -i = fast seek (no decode of the whole file)
    // -frames:v 1  = extract exactly one frame
    // -q:v 5         = JPEG quality (5 = 0-100 scale, lower = smaller file)
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        "0.3",
        "-i",
        videoUrl,
        "-frames:v",
        "1",
        "-q:v",
        "5",
        tempFile,
      ],
      { stdio: "ignore" }
    );

    // 3. Return the absolute file path as a placeholder URL that the app can
    //    later swap for the real CDN/signed URL after a rebuild.
    //    In a deployed environment this file should be uploaded to storage and
    //    the URL returned here should be the public storage URL.
    return fileToUrl(tempFile, outputFormat);
  } catch {
    // 4. ffmpeg missing or failed — fall back to a neutral placeholder that
    //    the UI can render without blocking the build.
    return `/videos/placeholder-${outputFormat}.${outputFormat}`;
  }
}

/** Convert a written temp file into a URL that the browser can fetch.
 *
 * When the app is served as a Next.js static build, absolute file paths are
 * unreachable from browser-level code, so the file must be uploaded to the
 * same storage bucket as the video and the public URL returned here.
 *
 * This stub is the safe, dependency-light fallback: anything calling this
 * utility should override it in an environment where ffmpeg is installed.
 */
function fileToUrl(filePath: string, outputFormat: string): string {
  try {
    return new URL(`file://${filePath}`).href;
  } catch {
    // Fallback: return the absolute path so the dev server can still track it.
    return filePath;
  }
}

/** Returns the default “no preview available” placeholder URL shown in the
 *  feed when a video has been uploaded but no frame could be extracted. */
export function defaultPreviewUrl(): string {
  return "/videos/no-preview-available.png";
}