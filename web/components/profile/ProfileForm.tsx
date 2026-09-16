"use client";

import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfilePhotoUploader } from "@/components/app/ProfilePhotoUploader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useProfileForm } from "@/lib/hooks/useProfileForm";
import type { UserProfile, User } from "@/lib/models";
import { BasicInfoFields } from "./BasicInfoFields";
import { BackgroundFields } from "./BackgroundFields";
import { InterestFields } from "./InterestFields";
import { IdentityFields } from "./IdentityFields";
import { PrivacyFields } from "./PrivacyFields";

interface ProfileFormProps {
  uid: string;
  mode: "create" | "edit";
  initialData: Partial<UserProfile> & { user?: User | null };
}

export function ProfileForm({ uid, mode, initialData }: ProfileFormProps) {
  const {
    formData,
    updateField,
    errors,
    isSubmitting,
    isSuccess,
    submitError,
    completion,
    handleSubmit,
    resetSuccess,
  } = useProfileForm(initialData, mode);

  const initialPhoto = (() => {
    const storagePath = initialData?.photos?.[0]?.storagePath;
    if (!storagePath) return initialData?.user?.avatarUrl ?? null;
    const fileName = storagePath.split("/").pop();
    if (!fileName) return initialData?.user?.avatarUrl ?? null;
    return `/api/photos/${uid}/${fileName}`;
  })();
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhoto);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Your profile"
        title={mode === "create" ? "Create your profile" : "Edit profile"}
        subtitle="This is what potential connections see. Keep it warm, honest, and current."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" href={mode === "create" ? "/dashboard" : "/profile"}>
              Cancel
            </Button>
            <Button type="submit" form="profile-form" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        }
      />

      {isSuccess && (
        <div className="rounded-xl border border-success-500/30 bg-success-500/10 px-4 py-3 text-sm text-success-200">
          Profile saved successfully.
          <button type="button" className="ml-2 underline" onClick={resetSuccess}>Dismiss</button>
        </div>
      )}
      {submitError && (
        <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-200">
          {submitError}
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Profile completion</h2>
          <span className="text-sm font-semibold text-brand-300">{completion.percentage}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={completion.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
          className="h-2 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${completion.percentage}%` }} />
        </div>
        {completion.missing.length > 0 && (
          <p className="text-sm text-ink-300">Add: {completion.missing.join(", ")}</p>
        )}
      </Card>

      <form id="profile-form" className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <input type="hidden" name="uid" value={uid} />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="flex flex-col items-center gap-4 text-center">
            <ProfilePhotoUploader
              uid={uid}
              currentUrl={photoUrl}
              displayName={formData.displayName}
              onUploadComplete={setPhotoUrl}
            />
            <Button size="sm" variant="ghost" href="/settings#profile">Manage all photos</Button>
          </Card>
          <div className="flex flex-col gap-6">
            <BasicInfoFields formData={formData} updateField={updateField} errors={errors} />
            <BackgroundFields formData={formData} updateField={updateField} errors={errors} />
            <InterestFields formData={formData} updateField={updateField} errors={errors} />
            <IdentityFields formData={formData} updateField={updateField} />
            <PrivacyFields formData={formData} updateField={updateField} />
          </div>
        </div>
      </form>
    </div>
  );
}
