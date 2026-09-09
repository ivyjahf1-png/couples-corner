/**
 * Couples Corner — profile completion & visibility types.
 *
 * These are view-layer types that complement the core models in `lib/models`.
 * They drive the profile setup/edit flows and the Discover privacy gate.
 */

import type { ProfileVisibility } from "./user";
import type { ProfilePhoto } from "./user";

export type { ProfileVisibility };
export type { ProfilePhoto };

/** Visibility options surfaced in the profile settings dropdown. */
export const VISIBILITY_OPTIONS: ReadonlyArray<{
  value: ProfileVisibility;
  label: string;
  hint: string;
}> = [
  { value: "public", label: "Everyone", hint: "Visible on Couples Corner, search engines, and in Discover." },
  {
    value: "connections",
    label: "Connections only",
    hint: "Only people you're connected with can see your full profile.",
  },
  { value: "private", label: "Hidden", hint: "Your profile is hidden from Discover and search." },
] as const;

/** Single field in the profile form, for consistent rendering/validation. **/
export interface ProfileFormField {
  id: string;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "email" | "date" | "select" | "tags";
  required?: boolean;
}