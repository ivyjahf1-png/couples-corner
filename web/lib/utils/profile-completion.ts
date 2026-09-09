/**
 * Client-safe profile-completion computation.
 *
 * Isolated here so client components can import it without pulling in the
 * server-only Admin SDK boundary from lib/server/profiles.ts.
 */

import type { UserProfile, User } from "@/lib/models";

const COMPLETION_FIELDS = [
  "displayName",
  "bio",
  "location",
  "gender",
  "orientation",
  "dateOfBirth",
  "relationshipStatus",
  "profileType",
] as const;

export interface ProfileCompletion {
  percentage: number;
  completed: string[];
  missing: string[];
}

export function computeProfileCompletion(
  profile: Partial<UserProfile | User> | null
): ProfileCompletion {
  if (!profile) {
    return { percentage: 0, completed: [], missing: [...COMPLETION_FIELDS] };
  }

  const completed: string[] = [];
  const missing: string[] = [];

  for (const field of COMPLETION_FIELDS) {
    const maybeValue = profile as Partial<Record<typeof field, unknown>>;
    const value = maybeValue[field];
    const isComplete =
      typeof value === "string"
        ? value.trim().length > 0
        : value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0);
    if (isComplete) completed.push(field);
    else missing.push(field);
  }

  const percentage = Math.round((completed.length / COMPLETION_FIELDS.length) * 100);
  return { percentage, completed, missing };
}
