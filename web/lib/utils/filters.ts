/**
 * Couples Corner — shared filter parsing utilities.
 *
 * This module is intentionally neutral: it has no `use client` directive and
 * no server-only imports, so it can be safely imported by both server pages
 * (e.g. app/(app)/discover/page.tsx) and client components
 * (e.g. components/app/DiscoverFiltersSync).
 */

import { defaultDiscoveryFilters, type DiscoveryFilters } from "@/lib/feature/types";

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
