"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { Avatar } from "@/components/app/Avatar";
import { completeOnboardingAction } from "@/lib/actions/profile";

type Gender = "male" | "female";

interface OnboardingData {
  dateOfBirth: string;
  displayName: string;
  gender: Gender;
  avatarUrl: string;
  uid?: string;
}

const EMPTY_DATA: OnboardingData = {
  dateOfBirth: "",
  displayName: "",
  gender: "male",
  avatarUrl: "",
};

const MAX_BYTES = 5 * 1024 * 1024;
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];

function BirthdayStep({ value, onChange, onConfirm }: { value: string; onChange: (v: string) => void; onConfirm: () => void }) {
  const isValid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return (
    <div className="flex flex-col items-center gap-6 px-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
        <Icon name="sparkle" className="h-8 w-8 text-brand-500" />
      </div>
      <h2 className="text-2xl font-semibold tracking-display text-ink-900">Nice to meet you!</h2>
      <p className="text-center text-ink-500">What is your birthday?</p>
      <div className="w-full max-w-xs">
        <label htmlFor="dob" className="sr-only">Birthday</label>
        <input id="dob" type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-xl border border-ink-300 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" />
      </div>
      <Button fullWidth disabled={!isValid} onClick={onConfirm}>Confirm</Button>
    </div>
  );
}

function PersonalInfoStep({ data, onUpdate, onBack, onComplete, saving, error }: { data: OnboardingData; onUpdate: (field: string, value: string) => void; onBack: () => void; onComplete: () => void; saving: boolean; error: string | null }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async () => {
    const input = inputRef.current;
    if (!input?.files?.[0]) return;
    const file = input.files[0];
    if (!VALID_TYPES.includes(file.type)) {
      setUploadError("Unsupported file type. Use JPG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Photo too large. Maximum size is 5 MB.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uid", data.uid ?? "");
      const response = await fetch("/api/photos/profile", { method: "POST", body: formData });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new Error(resData.error || "Upload failed");
      }
      const result = await response.json();
      onUpdate("avatarUrl", result.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [data.uid, onUpdate]);

  const canComplete = data.displayName.trim().length > 0;

  return (
    <div className="flex flex-col items-center gap-5 px-2">
      <h2 className="text-2xl font-semibold tracking-display text-ink-900">Perfecting Personal Information</h2>
      <p className="text-center text-sm text-ink-500">Set up your profile so others can get to know you.</p>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt={data.displayName} className="h-20 w-20 rounded-full object-cover ring-2 ring-brand-200" />
          ) : (
            <Avatar name={data.displayName || "U"} size="xl" />
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-900/40">
              <Icon name="sparkle" className="h-5 w-5 animate-spin text-white" />
            </span>
          )}
        </div>
        <Button size="sm" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {data.avatarUrl ? "Replace photo" : "Upload photo"}
        </Button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFileSelect} aria-label="Profile photo" />
        {uploadError && <p className="text-xs text-danger-600">{uploadError}</p>}
      </div>
      <div className="w-full">
        <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-ink-700">Nickname</label>
        <input id="nickname" type="text" value={data.displayName} onChange={(e) => onUpdate("displayName", e.target.value)} placeholder="How should we greet you?" maxLength={60} className="h-11 w-full rounded-xl border border-ink-300 bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" />
      </div>
      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-ink-700">Gender</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onUpdate("gender", "male")} className={"flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition " + (data.gender === "male" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-300 bg-white text-ink-600 hover:border-ink-400")}>Male</button>
          <button type="button" onClick={() => onUpdate("gender", "female")} className={"flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition " + (data.gender === "female" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-300 bg-white text-ink-600 hover:border-ink-400")}>Female</button>
        </div>
      </div>
      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-ink-700">Birthday</label>
        <div className="flex h-11 items-center rounded-xl border border-ink-200 bg-ink-50 px-3.5 text-sm text-ink-600">{data.dateOfBirth || "Not set"}</div>
      </div>
      {error && (<div role="alert" className="w-full rounded-xl border border-danger-300 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</div>)}
      <div className="flex w-full gap-3">
        <Button variant="secondary" fullWidth onClick={onBack}>Back</Button>
        <Button fullWidth disabled={!canComplete || saving} onClick={onComplete}>{saving ? "Saving..." : "Next"}</Button>
      </div>
    </div>
  );
}

export function OnboardingFlow({ uid, email }: { uid: string; email: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ ...EMPTY_DATA, uid });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: string, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      await completeOnboardingAction(uid, {
        displayName: data.displayName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth || null,
      });
      router.push("/discover");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-surface p-8 shadow-card">
        <div className="mb-8 flex items-center gap-3">
          <div className={"h-2 flex-1 rounded-full transition " + (step >= 1 ? "bg-brand-500" : "bg-ink-200")} />
          <div className={"h-2 flex-1 rounded-full transition " + (step >= 2 ? "bg-brand-500" : "bg-ink-200")} />
        </div>
        {step === 1 ? (
          <BirthdayStep value={data.dateOfBirth} onChange={(v) => updateField("dateOfBirth", v)} onConfirm={() => setStep(2)} />
        ) : (
          <PersonalInfoStep data={data} onUpdate={updateField} onBack={() => setStep(1)} onComplete={handleComplete} saving={saving} error={error} />
        )}
      </div>
    </div>
  );
}
