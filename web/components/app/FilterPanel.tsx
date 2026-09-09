"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import type { DiscoveryFilters } from "@/lib/feature/types";
import { defaultDiscoveryFilters } from "@/lib/feature/types";

const interestOptions = [
  "Board games",
  "Hiking",
  "Cooking",
  "Photography",
  "Travel",
  "Running",
  "Music",
  "Reading",
];

const fieldClasses =
  "w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none";

/**
 * Client-controlled discovery filter panel. State lives in the URL-ready
 * `DiscoveryFilters` shape so Firestore query construction can slot in later
 * without touching this component.
 */
export function FilterPanel({
  filters,
  onChange,
  resultCount,
}: {
  filters: DiscoveryFilters;
  onChange: (next: DiscoveryFilters) => void;
  resultCount?: number;
}) {
  const [open, setOpen] = useState(false);

  function patch(partial: Partial<DiscoveryFilters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <section aria-label="Search and filters" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <label htmlFor="discover-query" className="sr-only">Search</label>
          <input
            id="discover-query"
            type="search"
            value={filters.query}
            onChange={(event) => patch({ query: event.target.value })}
            placeholder="Search by name, interest, or place…"
            className={`${fieldClasses} pl-4`}
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          aria-controls="discover-filters"
          className="rounded-xl border border-ink-200 bg-surface px-4 py-2 text-sm font-medium text-ink-800 transition hover:bg-surface-muted"
        >
          Filters
        </button>
        {filters !== defaultDiscoveryFilters ? (
          <button
            type="button"
            onClick={() => onChange(defaultDiscoveryFilters)}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Clear all
          </button>
        ) : null}
        {typeof resultCount === "number" ? (
          <Chip tone="neutral">{resultCount} result{resultCount === 1 ? "" : "s"}</Chip>
        ) : null}
      </div>

      {open ? (
        <div
          id="discover-filters"
          className="grid gap-4 rounded-2xl border border-ink-200 bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label htmlFor="filter-location" className="text-sm font-medium text-ink-800">Location</label>
            <input
              id="filter-location"
              type="text"
              value={filters.location}
              onChange={(event) => patch({ location: event.target.value })}
              placeholder="City or region"
              className={`mt-1 ${fieldClasses}`}
            />
          </div>

          <div>
            <label htmlFor="filter-type" className="text-sm font-medium text-ink-800">Profile type</label>
            <select
              id="filter-type"
              value={filters.profileType}
              onChange={(event) => patch({ profileType: event.target.value as DiscoveryFilters["profileType"] })}
              className={`mt-1 ${fieldClasses}`}
            >
              <option value="all">Everyone</option>
              <option value="people">People</option>
              <option value="couples">Couples</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="text-sm font-medium text-ink-800">Relationship status</label>
            <select
              id="filter-status"
              value={filters.relationshipStatus}
              onChange={(event) =>
                patch({ relationshipStatus: event.target.value as DiscoveryFilters["relationshipStatus"] })
              }
              className={`mt-1 ${fieldClasses}`}
            >
              <option value="any">Any</option>
              <option value="single">Single</option>
              <option value="coupled">Coupled</option>
            </select>
          </div>

          <fieldset className="sm:col-span-2 lg:col-span-3">
            <legend className="text-sm font-medium text-ink-800">Interests</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {interestOptions.map((interest) => {
                const active = filters.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      patch({
                        interests: active
                          ? filters.interests.filter((i) => i !== interest)
                          : [...filters.interests, interest],
                      })
                    }
                    className={[
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                      active
                        ? "border-brand-600 bg-brand-100 text-brand-800"
                        : "border-ink-200 bg-surface text-ink-700 hover:bg-surface-muted",
                    ].join(" ")}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="sm:col-span-2 lg:col-span-3">
            <legend className="text-sm font-medium text-ink-800">
              Age range{" "}
              <span className="font-normal text-ink-500">
                {filters.ageRange ? `${filters.ageRange.min}–${filters.ageRange.max}` : "(any)"}
              </span>
            </legend>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={18}
                max={80}
                value={filters.ageRange?.min ?? 18}
                aria-label="Minimum age"
                onChange={(event) =>
                  patch({
                    ageRange: {
                      min: Math.min(Number(event.target.value), filters.ageRange?.max ?? 80),
                      max: filters.ageRange?.max ?? 80,
                    },
                  })
                }
                className="w-full accent-[var(--color-brand-700)]"
              />
              <input
                type="range"
                min={18}
                max={80}
                value={filters.ageRange?.max ?? 80}
                aria-label="Maximum age"
                onChange={(event) =>
                  patch({
                    ageRange: {
                      min: filters.ageRange?.min ?? 18,
                      max: Math.max(Number(event.target.value), filters.ageRange?.min ?? 18),
                    },
                  })
                }
                className="w-full accent-[var(--color-brand-700)]"
              />
            </div>
          </fieldset>
        </div>
      ) : null}
    </section>
  );
}
