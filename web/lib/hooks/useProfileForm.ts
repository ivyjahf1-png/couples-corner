"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { UserProfile, User } from "@/lib/models";
import { computeProfileCompletion } from "@/lib/utils/profile-completion";
import { parseHeightToCm, formatHeight } from "@/lib/utils/height";
import type { ProfileCompletion } from "@/lib/utils/profile-completion";
import { updateOwnProfileAction, createProfileAction } from "@/lib/actions/profile";

/** Shape of a profile update payload — mirrors UserProfile's editable fields. */
export interface ProfileUpdateInput {
  displayName?: string;
  bio?: string | null;
  interests?: string[];
  location?: string | null;
  country?: string | null;
  gender?: string | null;
  orientation?: string | null;
  dateOfBirth?: string | null;
  relationshipStatus?: string | null;
  occupation?: string | null;
  genotype?: string | null;
  /** Height in CENTIMETRES, or null when unset. See ProfileUpdateInput. */
  heightCm?: number | null;
  education?: string | null;
  lifestyle?: string[];
  profileType?: "single" | "coupled" | "open" | null;
  lookingFor?: string | null;
  visibility?: "public" | "connections" | "private";
  discoverable?: boolean;
}

export interface ProfileFormState {
  displayName: string;
  bio: string;
  interests: string[];
  location: string;
  country: string;
  gender: string;
  orientation: string;
  dateOfBirth: string;
  relationshipStatus: string;
  occupation: string;
  genotype: string;
  /**
   * Height as raw feet/inches TEXT, not centimetres.
   *
   * The member types "5'11\"" or "179cm"; converting to centimetres happens once,
   * at submit. Holding a pre-formatted string in state means the input can contain
   * a half-typed value ("5'") without the field thrashing or losing focus, which is
   * what storing a number and re-formatting on every keystroke would cause.
   */
  height: string;
  education: string;
  lifestyle: string[];
  profileType: "single" | "coupled" | "open";
  lookingFor: string;
  visibility: "public" | "connections" | "private";
  discoverable: boolean;
}

const initialFormState: ProfileFormState = {
  displayName: "",
  bio: "",
  interests: [],
  location: "",
  country: "",
  gender: "",
  orientation: "",
  dateOfBirth: "",
  relationshipStatus: "",
  occupation: "",
  genotype: "",
  height: "",
  education: "",
  lifestyle: [],
  lookingFor: "",
  profileType: "single",
  visibility: "public",
  discoverable: true,
};

export interface UseProfileFormReturn {
  formData: ProfileFormState;
  updateField: (field: keyof ProfileFormState, value: unknown) => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isSuccess: boolean;
  submitError: string | null;
  completion: ProfileCompletion;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  resetSuccess: () => void;
}

/**
 * Client-side profile form hook with validation, submission, and loading
 * states. Wires to the Server Actions bridge (`lib/actions/profile.ts`).
 * No data is persisted until the user clicks Save.
 */
export function useProfileForm(
  initialProfile: (Partial<UserProfile> | null) & { user?: User | null },
  mode: "create" | "edit"
): UseProfileFormReturn {
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileFormState>(() => {
    const base = { ...initialFormState };
    if (initialProfile) {
      base.displayName = initialProfile.displayName || initialProfile.user?.displayName || "";
      base.bio = initialProfile.bio || "";
      base.interests = initialProfile.interests || [];
      base.location = initialProfile.location || "";
      base.country = initialProfile.country || "";
      base.gender = initialProfile.gender || "";
      base.orientation = initialProfile.orientation || "";
      base.dateOfBirth = initialProfile.dateOfBirth || "";
      base.relationshipStatus = initialProfile.relationshipStatus || "";
      base.occupation = initialProfile.occupation || "";
      base.genotype = initialProfile.genotype || "";
      /* Migration 051 fields. `height` holds DISPLAY text, so it is rendered from
         the stored centimetres through the shared formatter rather than echoed
         raw — the stored value has always been a number. */
      base.height = formatHeight(initialProfile.heightCm) ?? "";
      base.education = initialProfile.education || "";
      base.lifestyle = initialProfile.lifestyle || [];
      base.lookingFor = initialProfile.lookingFor || "";
      base.profileType = initialProfile.profileType || "single";
      base.visibility = initialProfile.visibility || "public";
      base.discoverable = initialProfile.discoverable ?? true;
    }
    return base;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const completion = computeProfileCompletion(formData as Partial<UserProfile>);

  const updateField = useCallback(
    (field: keyof ProfileFormState, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.displayName.trim().length < 2) {
      newErrors.displayName = "Display name must be at least 2 characters.";
    }
    if (formData.displayName.trim().length > 50) {
      newErrors.displayName = "Display name must be 50 characters or fewer.";
    }
    if (formData.bio.length > 500) {
      newErrors.bio = "Bio must be 500 characters or fewer.";
    }
    if (formData.location.length > 100) {
      newErrors.location = "Location must be 100 characters or fewer.";
    }
    if (formData.country.length > 80) {
      newErrors.country = "Country must be 80 characters or fewer.";
    }
    if (formData.occupation.length > 100) {
      newErrors.occupation = "Occupation must be 100 characters or fewer.";
    }
    if (formData.genotype.length > 30) {
      newErrors.genotype = "Genotype must be 30 characters or fewer.";
    }
    if (formData.interests.length > 20) {
      newErrors.interests = "You can add up to 20 interests.";
    }
    if (formData.education.length > 120) {
      newErrors.education = "Education must be 120 characters or fewer.";
    }
    /* Height is validated by PARSING it, not by range-checking a number: the state
       holds free text, so the only way to know it is acceptable is to attempt the
       same conversion the submit path will do. An empty field is "not set", which
       is valid — it is not an error. */
    if (formData.height.trim() && parseHeightToCm(formData.height) === null) {
      newErrors.height = "Enter a height like 5'11\", 5ft 11in, or 179cm.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;

      if (!validate()) return;

      setIsSubmitting(true);
      setSubmitError(null);
      setIsSuccess(false);

      try {
        const payload: ProfileUpdateInput = {
          displayName: formData.displayName,
          bio: formData.bio || null,
          interests: formData.interests,
          location: formData.location || null,
          country: formData.country || null,
          gender: formData.gender || null,
          orientation: formData.orientation || null,
          dateOfBirth: formData.dateOfBirth || null,
          relationshipStatus: formData.relationshipStatus || null,
          occupation: formData.occupation || null,
          genotype: formData.genotype || null,
          /* Parsed here rather than in the field, so the exact value the member
             sees validated is the exact value that is written. An empty field
             becomes null ("not set"), which is different from 0. */
          heightCm: parseHeightToCm(formData.height),
          education: formData.education || null,
          lifestyle: formData.lifestyle,
          profileType: formData.profileType as ProfileFormState["profileType"] | null,
          lookingFor: formData.lookingFor || null,
          visibility: formData.visibility,
          discoverable: formData.discoverable,
        };

        // uid is passed from the authenticated session in the calling page —
        // the Server Action cannot be tricked into editing another user's profile.
        const uid = (event.currentTarget.elements.namedItem("uid") as HTMLInputElement)?.value;
        if (!uid) throw new Error("Session user id missing.");

        if (mode === "create") {
          await createProfileAction(uid, payload);
        } else {
          await updateOwnProfileAction(uid, payload);
        }

        /* WHY THE ROUTER IS REFRESHED HERE, AND WHY THIS IS THE ACTUAL FIX.

           `updateOwnProfileAction` already calls `revalidatePath("/profile")`,
           and that is correct — it invalidates the SERVER-side cache. But it is
           not sufficient on its own, and this is the difference between "saved"
           and "saved AND visible":

           The App Router keeps a client-side Router Cache of the last rendered
           RSC payload for routes the member has already visited. `revalidatePath`
           clears the server cache, but the browser can still hold the previous
           payload for `/profile` in memory and re-hydrate from it when the
           member navigates back from this edit screen — which is exactly the
           reported symptom: the profile shows the OLD bio, occupation and
           height until a hard refresh throws the tab's memory away.

           `router.refresh()` invalidates that client cache and re-fetches the
           current RSC payload for the routes already on screen, so the saved
           values are present the moment the member lands back on `/profile`,
           with no reload. It is the missing half of the existing revalidation,
           not a replacement for it.

           It is called only on success. Doing it in the `finally` would refetch
           and re-render the form on a failed save, discarding what the member
           just typed for no reason.

           `resetSuccess` is left alone: the "Profile saved successfully" banner
           stays up so the member gets explicit confirmation the write landed,
           rather than the screen silently swapping under them. */
        router.refresh();

        setIsSuccess(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    // `router` is a dep because `router.refresh()` is called inside; the App
    // Router's router object is stable, so this does not re-create the callback
    // on every render.
    [formData, isSubmitting, mode, validate, router]
  );

  const resetSuccess = useCallback(() => setIsSuccess(false), []);

  return {
    formData,
    updateField,
    errors,
    isSubmitting,
    isSuccess,
    submitError,
    completion,
    handleSubmit,
    resetSuccess,
  };
}
