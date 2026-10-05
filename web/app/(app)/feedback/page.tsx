"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { PageHeader, PageLock } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Bug, Camera, Lightbulb, Mail, MessageSquare, Phone, Send, X } from "lucide-react";

/**
 * USER FEEDBACK — the report form, rebuilt to the spec's four bands:
 *   1. Category — radio cards: App Problems · Bug · Suggestions.
 *   2. Details  — the description, plus the screenshot upload box.
 *   3. Contact  — WhatsApp · Email · Phone, with the phone input
 *                  pre-configured to the +234 country code.
 *   4. Submit   — enabled only once a category and details exist.
 *
 * SUBMISSION IS CLIENT-SIDE, like the form this replaces: there is no feedback
 * endpoint, and rendering a "received" state the server never saw would be a
 * lie. `setSent` is the seam a real `submitFeedbackAction` drops into.
 *
 * The screenshot preview is an object URL, revoked by the effect below whenever
 * the preview is replaced or the page unmounts — without that the blob leaks
 * for the lifetime of the tab.
 */

/* Dark slate surface shared with the Level and Badge screens. */
const CARD = "rounded-2xl border border-white/10 bg-[#0F172A]/70 shadow-lg";

const CATEGORIES = [
  {
    id: "app-problems",
    label: "App Problems",
    hint: "Something doesn't work as expected.",
    icon: MessageSquare,
  },
  { id: "bug", label: "Bug", hint: "A crash, glitch or broken screen.", icon: Bug },
  {
    id: "suggestion",
    label: "Suggestions",
    hint: "Ideas for features or improvements.",
    icon: Lightbulb,
  },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const CONTACTS = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "email", label: "Email", icon: Mail },
  { id: "phone", label: "Phone", icon: Phone },
] as const;

type ContactId = (typeof CONTACTS)[number]["id"];

export default function FeedbackPage() {
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [details, setDetails] = useState("");
  const [shot, setShot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /* Pre-configured: WhatsApp is the primary support channel, so the +234
     number input is what a member sees before touching anything. */
  const [contact, setContact] = useState<ContactId>("whatsapp");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  /* Cleanup runs when `previewUrl` changes (freeing the PREVIOUS blob) and on
     unmount — one effect covers both because each cleanup closes over the value
     from its own render. */
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function onPickScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setShot(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function clearScreenshot() {
    setShot(null);
    setPreviewUrl(null);
  }

  const ready = category !== null && details.trim().length > 0;

  return (
    <PageLock
      className="mx-auto w-full max-w-2xl"
      bodyClassName="pb-8"
      head={
        <PageHeader
          eyebrow="Support"
          title="User Feedback"
          subtitle="Tell us what is working and what we can improve."
        />
      }
    >
      <div className="flex flex-col gap-6">
        {sent ? (
          /* SUCCESS keeps the header (Back still reads correctly) and offers a
             reset rather than a dead end. */
          <div role="status" className={`${CARD} flex flex-col items-start gap-4 p-6`}>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              <Send className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Thank you — your feedback was received.
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                We review every report.{" "}
                {contact === "email"
                  ? "We will reply to your email address."
                  : "We will reach you on WhatsApp or your phone number."}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setSent(false)}>
              Send another
            </Button>
          </div>
        ) : (
          <>
            {/* ── 1. CATEGORY — radio cards, one selection required ────── */}
            <fieldset className={`${CARD} p-5`}>
              <legend className="text-sm font-bold uppercase tracking-wider text-white">
                Category
              </legend>
              <p className="mt-0.5 text-xs text-slate-400">What is this feedback about?</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {CATEGORIES.map((entry) => {
                  const active = category === entry.id;
                  return (
                    <label
                      key={entry.id}
                      className={[
                        "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition",
                        "focus-within:ring-2 focus-within:ring-[#FF7A00]",
                        active
                          ? "border-[#FF7A00] bg-[#FF7A00]/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="feedback-category"
                        value={entry.id}
                        checked={active}
                        onChange={() => setCategory(entry.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF7A00]"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                          <entry.icon className="h-3.5 w-3.5" aria-hidden />
                          {entry.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-400">
                          {entry.hint}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* ── 2. DETAILS + SCREENSHOT ──────────────────────────────── */}
            <section aria-label="Details" className={`${CARD} p-5`}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">Details</h2>
                <span className="text-xs tabular-nums text-slate-500">{details.length}/2000</span>
              </div>
              <textarea
                id="feedback-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="Describe what happened, or what you would like to see..."
                className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#FF7A00]"
              />

              {/* THE SCREENSHOT UPLOAD BOX. With a preview it becomes a
                  review row (thumb + filename + remove); without one it is the
                  dashed drop target. Same label wrapper both ways, so the file
                  dialog opens on tap either way and focus stays keyboard
                  reachable through the hidden input. */}
              {previewUrl ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  {/* Object URLs are ephemeral blobs; next/image cannot optimise
                      them, so a plain <img> is the correct element here. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Screenshot preview"
                    className="h-16 w-16 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{shot?.name}</p>
                    <p className="text-xs text-slate-400">Screenshot attached</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearScreenshot}
                    aria-label="Remove screenshot"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center transition hover:border-[#FF7A00]/60 hover:bg-[#FF7A00]/5 focus-within:ring-2 focus-within:ring-[#FF7A00]">
                  <Camera className="h-5 w-5 text-slate-400" aria-hidden />
                  <span className="text-sm font-semibold text-white">Add screenshot</span>
                  <span className="text-xs text-slate-400">PNG or JPG of the problem</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={onPickScreenshot}
                  />
                </label>
              )}
            </section>

            {/* ── 3. CONTACT OPTIONS — WhatsApp · Email · Phone ─────────── */}
            <fieldset className={`${CARD} p-5`}>
              <legend className="text-sm font-bold uppercase tracking-wider text-white">
                How should we reply?
              </legend>
              <p className="mt-0.5 text-xs text-slate-400">
                Pick a channel — the field below adapts to it.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {CONTACTS.map((entry) => {
                  const active = contact === entry.id;
                  return (
                    <label
                      key={entry.id}
                      className={[
                        "flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition",
                        "focus-within:ring-2 focus-within:ring-[#FF7A00]",
                        active
                          ? "border-[#FF7A00] bg-[#FF7A00]/15 text-[#FFA040]"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="feedback-contact"
                        value={entry.id}
                        checked={active}
                        onChange={() => setContact(entry.id)}
                        className="h-3.5 w-3.5 accent-[#FF7A00]"
                      />
                      <entry.icon className="h-3.5 w-3.5" aria-hidden />
                      {entry.label}
                    </label>
                  );
                })}
              </div>

              {/* THE ADAPTING FIELD. Phone and WhatsApp both take a number, so
                  they share the +234-prefixed input — the country code is a
                  fixed prefix, not a dropdown, because every number this form
                  collects is Nigerian by product design. Email swaps the whole
                  group for a single address input. */}
              <div className="mt-3">
                {contact === "email" ? (
                  <>
                    <label
                      htmlFor="feedback-email"
                      className="mb-1 block text-xs font-semibold text-slate-300"
                    >
                      Email address
                    </label>
                    <input
                      id="feedback-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#FF7A00]"
                    />
                  </>
                ) : (
                  <>
                    <label
                      htmlFor="feedback-phone"
                      className="mb-1 block text-xs font-semibold text-slate-300"
                    >
                      {contact === "whatsapp" ? "WhatsApp number" : "Phone number"}
                    </label>
                    <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-[#FF7A00]">
                      <span className="flex shrink-0 items-center gap-1.5 border-r border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-slate-300">
                        <span aria-hidden>🇳🇬</span>
                        +234
                      </span>
                      <input
                        id="feedback-phone"
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="801 234 5678"
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </>
                )}
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Used only to reply about this report.
                </p>
              </div>
            </fieldset>

            {/* ── 4. SUBMIT — enabled only when category + details exist ── */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {ready ? "Ready to send." : "Pick a category and add details to send."}
              </p>
              <Button disabled={!ready} onClick={() => setSent(true)}>
                Send feedback
              </Button>
            </div>
          </>
        )}
      </div>
    </PageLock>
  );
}



