"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/landing/Icon";
import type { ProfileFormState } from "@/lib/hooks/useProfileForm";

const INTEREST_SUGGESTIONS = ["Hiking", "Cooking", "Travel", "Board games", "Photography", "Jazz", "Ceramics", "Reading", "Music", "Fitness"];

interface FieldGroupProps {
  formData: ProfileFormState;
  updateField: (field: keyof ProfileFormState, value: unknown) => void;
  errors?: Record<string, string>;
}

export function InterestFields({ formData, updateField, errors }: FieldGroupProps) {
  const [input, setInput] = useState("");

  const addInterest = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !formData.interests.includes(trimmed) && formData.interests.length < 20) {
      updateField("interests", [...formData.interests, trimmed]);
    }
  };

  return (
    <Card as="section" className="flex flex-col gap-4" aria-label="Interests">
      <h2 className="font-semibold text-white">Interests</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addInterest(input);
              setInput("");
            }
          }}
          maxLength={30}
          className="h-10 flex-1 rounded-xl border border-ink-700 bg-surface px-4 text-sm text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none"
          placeholder="e.g. Hiking"
        />
        <button
          type="button"
          className="rounded-xl border border-brand-500/60 bg-brand-500/15 px-4 text-sm font-medium text-brand-200 hover:bg-brand-500/20"
          onClick={() => { addInterest(input); setInput(""); }}
        >Add</button>
      </div>
      {errors?.interests ? <p className="text-xs text-danger-300">{errors.interests}</p> : null}
      <div className="flex flex-wrap gap-2">
        {formData.interests.map((interest) => (
          <span key={interest} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-ink-200">
            {interest}
            <button
              type="button"
              className="rounded-full p-0.5 text-ink-400 hover:bg-white/15"
              onClick={() => updateField("interests", formData.interests.filter((i) => i !== interest))}
              aria-label={`Remove ${interest}`}
            >
              <Icon name="arrow" className="h-3 w-3 rotate-45" />
            </button>
          </span>
        ))}
      </div>
      {formData.interests.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {INTEREST_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="rounded-full border border-ink-700 bg-surface px-3 py-1.5 text-xs font-medium text-ink-200 transition hover:border-ink-600 hover:bg-surface-muted"
              onClick={() => updateField("interests", [...formData.interests, suggestion])}
            >+ {suggestion}</button>
          ))}
        </div>
      )}
    </Card>
  );
}
