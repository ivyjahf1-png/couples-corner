"use client";

import { Card } from "@/components/ui/Card";
import { LIFESTYLE_OPTIONS } from "@/lib/utils/height";
import type { ProfileFormState } from "@/lib/hooks/useProfileForm";

interface FieldGroupProps {
  formData: ProfileFormState;
  updateField: (field: keyof ProfileFormState, value: unknown) => void;
  errors?: Record<string, string>;
}

/** Shared input chrome so the two text fields cannot drift apart. */
function inputClass(error?: string): string {
  return [
    "h-11 w-full rounded-xl border bg-[#1E293B] px-3 text-sm text-white placeholder:text-ink-500",
    "focus:outline-none focus:ring-2",
    error
      ? "border-danger-500/60 focus:ring-danger-400/60"
      : "border-white/10 focus:border-orange-400/50 focus:ring-orange-400/40",
  ].join(" ");
}

/**
 * The three profile attributes added in migration 051: Height, Education and
 * Lifestyle.
 *
 * WHY A SEPARATE CARD RATHER THAN MORE ROWS IN BackgroundFields: `BackgroundFields`
 * is three COMBOBOXES driven by curated datasets (occupations, genotypes,
 * countries), and each is freeform-with-suggestions. These three have genuinely
 * different input mechanics — a unit-parsing text field, a plain text field, and a
 * multi-select tag toggle — so folding them in would mean teaching that component
 * three unrelated control types. Kept separate, each is obvious.
 */
export function AboutFields({ formData, updateField, errors }: FieldGroupProps) {
  return (
    <Card as="section" className="flex flex-col gap-4" aria-label="About me">
      <h2 className="font-semibold text-white">About me</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* HEIGHT.

            Free text rather than a <select> of presets because the input space is
            two units wide: "5'11"", "5ft 11in" and "179cm" all have to work. The
            placeholder shows both shapes and the hint states the accepted formats,
            so a rejected value is never a mystery — the parser in
            lib/utils/height.ts returns null and the error repeats the formats. */}
        <div>
          <label htmlFor="height" className="mb-1.5 block text-sm font-medium text-ink-200">
            Height
          </label>
          <input
            id="height"
            type="text"
            value={formData.height}
            onChange={(e) => updateField("height", e.target.value)}
            placeholder="5'11&quot; or 179cm"
            aria-invalid={errors?.height ? true : undefined}
            aria-describedby={errors?.height ? "height-error" : "height-hint"}
            className={inputClass(errors?.height)}
          />
          {errors?.height ? (
            <p id="height-error" role="alert" className="mt-1.5 text-xs text-danger-300">
              {errors.height}
            </p>
          ) : (
            <p id="height-hint" className="mt-1.5 text-xs text-ink-400">
              Accepts feet/inches or centimetres.
            </p>
          )}
        </div>

        {/* EDUCATION.

            Free text, not a combobox: degrees are combinatorial ("BSc Computer
            Science", "HND Electrical Engineering"), so a curated list would reject
            most real answers. Capped at 120 characters to match the column's
            documented intent and the client-side validation. */}
        <div>
          <label htmlFor="education" className="mb-1.5 block text-sm font-medium text-ink-200">
            Education
          </label>
          <input
            id="education"
            type="text"
            value={formData.education}
            onChange={(e) => updateField("education", e.target.value)}
            maxLength={120}
            placeholder="BSc Computer Science"
            aria-invalid={errors?.education ? true : undefined}
            aria-describedby={errors?.education ? "education-error" : undefined}
            className={inputClass(errors?.education)}
          />
          {errors?.education ? (
            <p id="education-error" role="alert" className="mt-1.5 text-xs text-danger-300">
              {errors.education}
            </p>
          ) : null}
        </div>
      </div>

      {/* LIFESTYLE.

          A toggle group of checkboxes, not <select multiple>: on a phone a
          multi-select is a native dialog that hides the rest of the form, and
          these are short labels a member can scan and tap in one pass.

          Real <input type="checkbox"> elements rather than buttons carrying
          aria-pressed, so they are keyboard-reachable, announce their state
          natively, and submit with the form. `appearance-none` removes the default
          box and `peer-checked` drives the label's colour, so the visual state
          cannot drift from the real one.

          This control only ADDS to or REMOVES from the array — it never rewrites
          it wholesale, which is why a tag a member added elsewhere survives a save
          from this form untouched. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink-200">Lifestyle</legend>
        <div className="flex flex-wrap gap-2">
          {LIFESTYLE_OPTIONS.map((option) => {
            const checked = formData.lifestyle.includes(option.id);
            return (
              <label key={option.id} className="group inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...formData.lifestyle, option.id]
                      : formData.lifestyle.filter((id) => id !== option.id);
                    updateField("lifestyle", next);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400/60",
                    checked
                      ? "border-orange-400/60 bg-orange-500/20 text-orange-100"
                      : "border-white/10 bg-white/[0.04] text-ink-300 group-hover:bg-white/[0.08] group-hover:text-white",
                  ].join(" ")}
                >
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </Card>
  );
}