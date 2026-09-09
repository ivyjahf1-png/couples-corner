"use client";

import { useState, useCallback } from "react";
import type { FormEvent } from "react";
import type { UserProfile, User } from "@/lib/models";
import { computeProfileCompletion } from "@/lib/utils/profile-completion";
import type { ProfileCompletion } from "@/lib/utils/profile-completion";
import { updateOwnProfileAction, createProfileAction } from "@/lib/actions/profile";

/** Shape of a profile update payload — mirrors UserProfile's editable fields. */
export interface ProfileUpdateInput {
  displayName?: string;
  bio?: string | null;
  interests?: string[];
  location?: string | null;
  gender?: string | null;
  orientation?: string | null;
  dateOfBirth?: string | null;
  relationshipStatus?: string | null;
  profileType?: "single" | "coupled" | "open" | null;
  visibility?: "public" | "connections" | "private";
  discoverable?: boolean;
}

export interface ProfileFormState {
  displayName: string;
  bio: string;
  interests: string[];
  location: string;
  gender: string;
  orientation: string;
  dateOfBirth: string;
  relationshipStatus: string;
  profileType: "single" | "coupled" | "open";
  visibility: "public" | "connections" | "private";
  discoverable: boolean;
}

const initialFormState: ProfileFormState = {
  displayName: "",
  bio: "",
  interests: [],
  location: "",
  gender: "",
  orientation: "",
  dateOfBirth: "",
  relationshipStatus: "",
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
  const [formData, setFormData] = useState<ProfileFormState>(() => {
    const base = { ...initialFormState };
    if (initialProfile) {
      base.displayName = initialProfile.displayName || initialProfile.user?.displayName || "";
      base.bio = initialProfile.bio || "";
      base.interests = initialProfile.interests || [];
      base.location = initialProfile.location || "";
      base.gender = initialProfile.gender || "";
      base.orientation = initialProfile.orientation || "";
      base.dateOfBirth = initialProfile.dateOfBirth || "";
      base.relationshipStatus = initialProfile.relationshipStatus || "";
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
    if (formData.interests.length > 20) {
      newErrors.interests = "You can add up to 20 interests.";
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
          gender: formData.gender || null,
          orientation: formData.orientation || null,
          dateOfBirth: formData.dateOfBirth || null,
          relationshipStatus: formData.relationshipStatus || null,
          profileType: formData.profileType as ProfileFormState["profileType"] | null,
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

        setIsSuccess(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, isSubmitting, mode, validate]
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
