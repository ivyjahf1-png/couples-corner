"use client";

import { useState } from "react";
import { FeedUploadModal } from "@/components/app/FeedUploadModal";

export function FeedCreateLauncher({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Create a post" className="fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/60 bg-gradient-to-br from-amber-300 to-orange-500 text-3xl font-bold text-slate-950 shadow-2xl shadow-orange-950/50 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 md:bottom-8 md:right-8">
        +
      </button>
      {open ? <FeedUploadModal userId={userId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
