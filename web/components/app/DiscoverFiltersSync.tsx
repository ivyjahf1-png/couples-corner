"use client";

import { defaultDiscoveryFilters, type DiscoveryFilters } from "@/lib/feature/types";
import { parseDiscoveryFilters } from "@/lib/utils/filters";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Props {
  filters: DiscoveryFilters;
  resultCount: number;
}

export function DiscoverFiltersSync({ filters, resultCount }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const updateFilters = useCallback(
    (next: DiscoveryFilters) => {
      const entries: [string, string][] = [];
      if (next.query) entries.push(["q", next.query]);
      if (next.location) entries.push(["loc", next.location]);
      if (next.ageRange) {
        entries.push(["minAge", String(next.ageRange.min)]);
        entries.push(["maxAge", String(next.ageRange.max)]);
      }
      if (next.interests.length) entries.push(["interests", next.interests.join(",")]);
      if (next.profileType !== "all") entries.push(["type", next.profileType]);
      if (next.relationshipStatus !== "any") entries.push(["status", next.relationshipStatus]);
      if (next.lookingFor) entries.push(["lookingFor", next.lookingFor]);

      const params = new URLSearchParams();
      for (const [key, value] of entries) params.set(key, value);

      router.push("/discover" + (params.toString() ? `?${params.toString()}` : ""), {
        scroll: false,
      });
    },
    [router]
  );

  return null;
}