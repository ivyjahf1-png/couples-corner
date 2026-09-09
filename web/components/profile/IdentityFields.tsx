"use client";

import { Card } from "@/components/ui/Card";
import type { ProfileFormState } from "@/lib/hooks/useProfileForm";

interface FieldGroupProps {
  formData: ProfileFormState;
  updateField: (field: keyof ProfileFormState, value: unknown) => void;
}

export function IdentityFields({ formData, updateField }: FieldGroupProps) {
  return (
    <Card as="section" className="flex flex-col gap-4" aria-label="Identity">
      <h2 className="font-semibold text-ink-900">Identity</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-ink-700">Location</label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => updateField("location", e.target.value)}
            maxLength={100}
            className="h-10 w-full rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
            placeholder="City, Country"
          />
        </div>
        <div>
          <label htmlFor="relationshipStatus" className="mb-1.5 block text-sm font-medium text-ink-700">Relationship status</label>
          <select
            id="relationshipStatus"
            value={formData.relationshipStatus}
            onChange={(e) => updateField("relationshipStatus", e.target.value || null)}
            className="h-10 w-full rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          >
            <option value="">Prefer not to say</option>
            <option value="single">Single</option>
            <option value="coupled">In a relationship</option>
            <option value="open">Open</option>
          </select>
        </div>
        <div>
          <label htmlFor="gender" className="mb-1.5 block text-sm font-medium text-ink-700">Gender</label>
          <select
            id="gender"
            value={formData.gender}
            onChange={(e) => updateField("gender", e.target.value || null)}
            className="h-10 w-full rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          >
            <option value="">Prefer not to say</option>
            <option value="woman">Woman</option>
            <option value="man">Man</option>
            <option value="non-binary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="orientation" className="mb-1.5 block text-sm font-medium text-ink-700">Orientation</label>
          <select
            id="orientation"
            value={formData.orientation}
            onChange={(e) => updateField("orientation", e.target.value || null)}
            className="h-10 w-full rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          >
            <option value="">Prefer not to say</option>
            <option value="straight">Straight</option>
            <option value="gay">Gay</option>
            <option value="lesbian">Lesbian</option>
            <option value="bisexual">Bisexual</option>
            <option value="queer">Queer</option>
          </select>
        </div>
        <div>
          <label htmlFor="dateOfBirth" className="mb-1.5 block text-sm font-medium text-ink-700">Date of birth</label>
          <input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => updateField("dateOfBirth", e.target.value || null)}
            className="h-10 w-full rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="profileType" className="mb-1.5 block text-sm font-medium text-ink-700">Profile type</label>
          <select
            id="profileType"
            value={formData.profileType}
            onChange={(e) => updateField("profileType", e.target.value)}
            className="h-10 w-full rounded-xl border border-ink-200 bg-surface px-4 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          >
            <option value="single">Individual</option>
            <option value="coupled">Couple</option>
            <option value="open">Open</option>
          </select>
        </div>
      </div>
    </Card>
  );
}
