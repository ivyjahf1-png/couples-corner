"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FilterPanel } from "@/components/app/FilterPanel";
import {
  defaultDiscoveryFilters,
  type DiscoveryFilters,
} from "@/lib/feature/types";

/**
 * URL-synced discovery filters. FilterPanel stays the interactive control;
 * this wrapper serializes each change into the /discover query string so the
 * server page re-runs the real Firestore query with the new filters.
 */
export function DiscoverFiltersSync({
  filters,
  resultCount,
}: {
  filters: DiscoveryFilters;
  resultCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(next: DiscoveryFilters) {
    const params = new URLSearchParams();
    if (next.query.trim()) params.set("q", next.query.trim());
    if (next.location.trim()) params.set("loc", next.location.trim());
    if (next.ageRange) {
      params.set("minAge", String(next.ageRange.min));
      params.set("maxAge", String(next.ageRange.max));
    }
    if (next.interests.length > 0) params.set("interests", next.interests.join(","));
    if (next.profileType !== "all") params.set("type", next.profileType);
    if (next.relationshipStatus !== "any") params.set("status", next.relationshipStatus);

    startTransition(() => {
      router.push(params.size > 0 ? `/discover?${params.toString()}` : "/discover");
    });
  }

  return (
    <div aria-busy={pending}>
      <FilterPanel filters={filters} onChange={apply} resultCount={resultCount} />
    </div>
  );
}

/** Parse /discover search params back into the DiscoveryFilters shape. */
export function parseDiscoveryFilters(
  params: Record<string, string | string[] | undefined>
): DiscoveryFilters {
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const filters: DiscoveryFilters = { ...defaultDiscoveryFilters };
  const q = get("q");
  if (q) filters.query = q;
  const loc = get("loc");
  if (loc) filters.location = loc;

  const minAge = Number(get("minAge"));
  const maxAge = Number(get("maxAge"));
  if (!Number.isNaN(minAge) && !Number.isNaN(maxAge) && get("minAge") && get("maxAge")) {
    filters.ageRange = { min: minAge, max: maxAge };
  }

  const interests = get("interests");
  if (interests) {
    filters.interests = interests.split(",").map((i) => i.trim()).filter(Boolean);
  }

  const type = get("type");
  if (type === "people" || type === "couples") filters.profileType = type;
  const status = get("status");
  if (status === "single" || status === "coupled") filters.relationshipStatus = status;

  return filters;
}
