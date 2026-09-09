"use client";

import { Card } from "@/components/ui/Card";
import { VISIBILITY_OPTIONS } from "@/lib/models";
import type { ProfileFormState } from "@/lib/hooks/useProfileForm";

interface FieldGroupProps {
  formData: ProfileFormState;
  updateField: (field: keyof ProfileFormState, value: unknown) => void;
}

export function PrivacyFields({ formData, updateField }: FieldGroupProps) {
  return (
    <Card as="section" className="flex flex-col gap-4" aria-label="Privacy">
      <h2 className="font-semibold text-ink-900">Privacy</h2>
      <div>
        <label htmlFor="visibility" className="mb-1.5 block text-sm font-medium text-ink-700">
          Who can see your profile
        </label>
        <select
          id="visibility"
          value={formData.visibility}
          onChange={(e) => updateField("visibility", e.target.value as ProfileFormState["visibility"])}
          className="h-10 w-full rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {VISIBILITY_OPTIONS.find((o) => o.value === formData.visibility)?.hint ? (
          <p className="mt-1 text-xs text-ink-600">
            {VISIBILITY_OPTIONS.find((o) => o.value === formData.visibility)?.hint}
          </p>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={formData.discoverable}
          onChange={(e) => updateField("discoverable", e.target.checked)}
          className="h-4 w-4 accent-brand-700"
        />
        <span>Appear in Discover</span>
      </label>
    </Card>
  );
}
