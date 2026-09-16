"use client";

import { Card } from "@/components/ui/Card";
import { Combobox } from "@/components/ui/Combobox";
import { searchOccupations } from "@/lib/data/occupations";
import { searchGenotypes } from "@/lib/data/genotypes";
import { searchCountries } from "@/lib/data/countries";
import type { ProfileFormState } from "@/lib/hooks/useProfileForm";

interface FieldGroupProps {
  formData: ProfileFormState;
  updateField: (field: keyof ProfileFormState, value: unknown) => void;
  errors?: Record<string, string>;
}

/**
 * Background details: Occupation (large freeform combobox), Genotype (coded
 * options + custom), and Country (worldwide searchable selector). Supports
 * international users by defaulting to no hardcoded region.
 */
export function BackgroundFields({ formData, updateField, errors }: FieldGroupProps) {
  return (
    <Card as="section" className="flex flex-col gap-4" aria-label="Background">
      <h2 className="font-semibold text-white">Background</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Combobox
            id="occupation"
            label="Occupation"
            value={formData.occupation}
            onChange={(v) => updateField("occupation", v || null)}
            suggestions={(q, max) => searchOccupations(q, max)}
            placeholder="Search or type your occupation…"
            hint="Start typing to see suggestions, or type your own."
            error={errors?.occupation}
            emptyMessage="No match - you can still save your own occupation."
          />
        </div>
        <Combobox
          id="genotype"
          label="Genotype"
          value={formData.genotype}
          onChange={(v) => updateField("genotype", v || null)}
          suggestions={(q, max) => searchGenotypes(q, max)}
          placeholder="e.g. AA, AS, SS…"
          hint="Select a genotype or type your own."
          error={errors?.genotype}
          emptyMessage="No match - you can still type your own."
        />
        <Combobox
          id="country"
          label="Country"
          value={formData.country}
          onChange={(v) => updateField("country", v || null)}
          suggestions={(q, max) => searchCountries(q, max)}
          placeholder="Search 200+ countries…"
          hint="We support users worldwide."
          error={errors?.country}
          emptyMessage="No match - type the full country name."
        />
      </div>
    </Card>
  );
}