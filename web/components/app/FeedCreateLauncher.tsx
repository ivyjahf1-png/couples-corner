"use client";

import { useState } from "react";
import { FeedUploadModal } from "@/components/app/FeedUploadModal";

export function FeedCreateLauncher({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Create a post" className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/50 bg-gradient-to-br from-amber-400 to-orange-600 text-2xl font-bold text-slate-950 shadow-xl shadow-orange-950/40 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">
        +
      </button>
      {open ? <FeedUploadModal userId={userId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
