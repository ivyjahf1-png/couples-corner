"use client";

import { Card } from "@/components/ui/Card";
import type { ProfileFormState } from "@/lib/hooks/useProfileForm";

interface FieldGroupProps {
  formData: ProfileFormState;
  updateField: (field: keyof ProfileFormState, value: unknown) => void;
  errors?: Record<string, string>;
}

export function BasicInfoFields({ formData, updateField, errors }: FieldGroupProps) {
  return (
    <Card as="section" className="flex flex-col gap-4" aria-label="About">
      <h2 className="font-semibold text-ink-900">About</h2>
      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-ink-700">
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          value={formData.displayName}
          onChange={(e) => updateField("displayName", e.target.value)}
          maxLength={50}
          className="h-10 w-full rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          aria-invalid={!!errors?.displayName}
          aria-describedby={errors?.displayName ? "displayName-error" : undefined}
        />
        {errors?.displayName ? (
          <p id="displayName-error" className="mt-1 text-xs text-danger-700">{errors.displayName}</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-ink-700">
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          value={formData.bio}
          onChange={(e) => updateField("bio", e.target.value)}
          maxLength={500}
          className="w-full resize-none rounded-xl border border-ink-200 bg-surface px-4 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          placeholder="Tell people what makes you, you."
          aria-invalid={!!errors?.bio}
          aria-describedby={errors?.bio ? "bio-error" : undefined}
        />
        {errors?.bio ? (
          <p id="bio-error" className="mt-1 text-xs text-danger-700">{errors.bio}</p>
        ) : null}
      </div>
    </Card>
  );
}
