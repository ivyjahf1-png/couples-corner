"use client";

import { useState } from "react";
import { FeedUploadModal } from "@/components/app/FeedUploadModal";

export function FeedCreateLauncher({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Create a post" className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] right-4 z-[70] flex h-16 w-16 items-center justify-center rounded-full border border-blue-300/40 bg-gradient-to-br from-blue-600 via-blue-500 to-violet-500 text-4xl font-semibold leading-none text-white shadow-[0_0_0_5px_rgba(37,99,235,0.12),0_12px_32px_rgba(37,99,235,0.42)] transition hover:scale-105 hover:shadow-[0_0_0_6px_rgba(37,99,235,0.16),0_16px_38px_rgba(99,102,241,0.52)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-95 md:bottom-8 md:right-8">
        +
      </button>
      {open ? <FeedUploadModal userId={userId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
