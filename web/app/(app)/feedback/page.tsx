"use client";

import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function FeedbackPage() {
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader eyebrow="Support" title="User Feedback" subtitle="Tell us what is working and what we can improve." />
      <Card className="flex flex-col gap-4">
        {sent ? (
          <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm text-emerald-200">Thank you - your feedback was received.</div>
        ) : (
          <>
            <label htmlFor="feedback-message" className="text-sm font-medium text-white">How can we improve?</label>
            <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={7} maxLength={2000} placeholder="Share your experience or report a problem..." className="w-full resize-y rounded-xl border border-ink-700 bg-surface p-4 text-sm text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none" />
            <div className="flex items-center justify-between gap-3"><p className="text-xs text-ink-400">{message.length}/2000</p><Button disabled={!message.trim()} onClick={() => setSent(true)}>Send feedback</Button></div>
          </>
        )}
      </Card>
    </div>
  );
}