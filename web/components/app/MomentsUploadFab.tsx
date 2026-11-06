"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Floating camera action button for the Moments screen. The live app used to
 * carry this as an in-flow `+` control; it was accidentally dropped when the
 * hub layout was simplified, so this small, fixed control restores the gesture.
 *
 * Tapping it opens the same video upload form the Task Center uses, instead of
 * inventing a duplicate upload path.
 */
export function MomentsUploadFab() {
  return (
    <Link
      href="/task/upload-moment"
      aria-label="Upload a new video moment"
      className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl transition hover:bg-purple-500 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}
