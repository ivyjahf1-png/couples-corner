"use client";

import { useState } from "react";
import { FeedUploadModal } from "@/components/app/FeedUploadModal";

export function FeedCreateLauncher({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Create a post" className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))] right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-orange-500 via-[#FF5722] to-amber-400 text-3xl font-bold leading-none text-white shadow-[0_0_0_4px_rgba(255,87,34,0.14),0_14px_34px_rgba(255,87,34,0.45)] transition hover:scale-105 hover:shadow-[0_0_0_5px_rgba(255,87,34,0.18),0_18px_40px_rgba(255,87,34,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-95 md:bottom-8 md:right-8">
        +
      </button>
      {open ? <FeedUploadModal userId={userId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
