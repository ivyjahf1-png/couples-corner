"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Check, ChevronRight } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { PROFILE_PHOTOS_BUCKET, uploadFileDirect } from "@/lib/utils/direct-upload";
import { updateOwnProfileAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

interface ProfilePhoto {
  id: string;
  photo_url: string;
  storage_path?: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

interface ProfileData {
  displayName: string;
  bio: string;
  interests: string[];
  gender: string;
  dateOfBirth: string;
  country: string;
}

const GENDER_OPTIONS = [
  { label: "Woman", value: "woman" },
  { label: "Man", value: "man" },
  { label: "Non-binary", value: "non-binary" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
];

const INTEREST_SUGGESTIONS = [
  "Hiking", "Cooking", "Travel", "Board games", "Photography",
  "Jazz", "Ceramics", "Reading", "Music", "Fitness",
  "Dancing", "Art", "Design", "Singing", "Writing",
];

export function PersonalInfoManager({
  uid,
  profile,
  photos: initialPhotos,
}: {
  uid: string;
  profile: { displayName?: string | null; bio?: string | null; interests?: string[] | null; gender?: string | null; dateOfBirth?: string | null; country?: string | null } | null;
  photos: ProfilePhoto[];
}) {
  const [photoList, setPhotoList] = useState<ProfilePhoto[]>(initialPhotos);
  const [formData, setFormData] = useState<ProfileData>(() => ({
    displayName: profile?.displayName ?? "",
    bio: profile?.bio ?? "",
    interests: Array.isArray(profile?.interests) ? profile.interests : [],
    gender: profile?.gender ?? "",
    dateOfBirth: profile?.dateOfBirth ?? "",
    country: profile?.country ?? "",
  }));
  const [newInterest, setNewInterest] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const supabase = getSupabaseClient();

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setFeedback({ tone: "err", text: "Please select an image file." });
      return;
    }
    try {
      const uploaded = await uploadFileDirect(uid, file, {
        bucket: PROFILE_PHOTOS_BUCKET,
        profilePhoto: true,
      });
      if (!uploaded.ok) {
        setFeedback({ tone: "err", text: uploaded.error });
        return;
      }
      const { error: insertError } = await supabase
        .from("profile_photos")
        .insert({
          user_id: uid,
          photo_url: uploaded.publicUrl,
          storage_path: uploaded.storagePath,
          display_order: photoList.length,
          is_primary: photoList.length === 0,
        });
      if (insertError) {
        await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([uploaded.storagePath]).catch(() => undefined);
        setFeedback({ tone: "err", text: "Failed to save photo. Please try again." });
        return;
      }
      const next = [...photoList, {
        id: uploaded.storagePath,
        photo_url: uploaded.publicUrl,
        storage_path: uploaded.storagePath,
        display_order: photoList.length,
        is_primary: photoList.length === 0,
        created_at: new Date().toISOString(),
      }];
      setPhotoList(next);
      setFeedback({ tone: "ok", text: "Photo uploaded." });
    } catch (error) {
      console.error("Upload error:", error);
      setFeedback({ tone: "err", text: "Failed to upload photo. Please try again." });
    } finally {
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photo: ProfilePhoto) => {
    if (!confirm("Delete this photo?")) return;
    try {
      const { error } = await supabase
        .from("profile_photos")
        .delete()
        .eq("id", photo.id)
        .eq("user_id", uid);
      if (error) {
        setFeedback({ tone: "err", text: "Failed to delete photo." });
        return;
      }
      if (photo.storage_path) {
        await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([photo.storage_path]).catch(() => undefined);
      }
      setPhotoList((prev) => {
        const next = prev.filter((p) => p.id !== photo.id);
        if (photo.is_primary && next.length > 0 && !next.some((p) => p.is_primary)) {
          next[0].is_primary = true;
        }
        return next;
      });
      setFeedback({ tone: "ok", text: "Photo deleted." });
    } catch (error) {
      console.error("Delete error:", error);
      setFeedback({ tone: "err", text: "Failed to delete photo." });
    }
  };

  const handleSetPrimary = async (photo: ProfilePhoto) => {
    if (photo.is_primary) return;
    try {
      await supabase.from("profile_photos").update({ is_primary: false }).eq("user_id", uid);
      const { error } = await supabase
        .from("profile_photos")
        .update({ is_primary: true })
        .eq("id", photo.id)
        .eq("user_id", uid);
      if (error) {
        setFeedback({ tone: "err", text: "Failed to set primary photo." });
        return;
      }
      setPhotoList((prev) => prev.map((p) => ({ ...p, is_primary: p.id === photo.id })));
      setFeedback({ tone: "ok", text: "Primary photo updated." });
    } catch (error) {
      console.error("Set primary error:", error);
      setFeedback({ tone: "err", text: "Failed to set primary photo." });
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateOwnProfileAction(uid, {
        displayName: formData.displayName.trim() || null,
        bio: formData.bio.trim() || null,
        interests: formData.interests,
        gender: formData.gender.trim() || null,
        dateOfBirth: formData.dateOfBirth || null,
        country: formData.country.trim() || null,
      });
      setFeedback({ tone: "ok", text: "Profile saved." });
    } catch (error) {
      setFeedback({ tone: "err", text: error instanceof Error ? error.message : "Failed to save profile." });
    } finally {
      setIsSaving(false);
    }
  };

  const addInterest = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || formData.interests.includes(trimmed)) return;
    setFormData((d) => ({ ...d, interests: [...d.interests, trimmed] }));
  };

  const removeInterest = (val: string) => {
    setFormData((d) => ({ ...d, interests: d.interests.filter((i) => i !== val) }));
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addInterest(newInterest);
      setNewInterest("");
    }
  };

  const emptySlots = Math.max(0, 9 - photoList.length);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Photos</h2>
          <span className="text-xs text-[#A09AB0]">{photoList.length}/9</span>
        </div>

        {feedback && (
          <p className={`mb-3 px-3 py-1.5 rounded-xl text-xs font-medium ${
            feedback.tone === "ok" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>{feedback.text}</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {photoList.map((photo) => (
            <div key={photo.id} className="relative aspect-square group rounded-xl overflow-hidden border border-white/10">
              <Image
                src={photo.photo_url}
                alt={photo.is_primary ? "Main profile photo" : `Profile photo ${photo.display_order + 1}`}
                fill
                sizes="(max-width: 768px) 30vw, 20vw"
                priority={photo.is_primary}
                className="object-cover"
              />
              {photo.is_primary && (
                <span className="absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[#0F0C1B] text-[10px] font-bold">
                  <Check className="h-2.5 w-2.5" /> Main
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSetPrimary(photo)}
                disabled={photo.is_primary}
                className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#0F0C1B] text-xs font-medium transition opacity-0 group-hover:opacity-100 ${
                  photo.is_primary ? "opacity-100 pointer-events-none" : ""
                }`}
                aria-label={photo.is_primary ? "Already main photo" : "Set as main photo"}
              >
                Main
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }}
                className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white transition opacity-0 group-hover:opacity-100"
                aria-label="Delete photo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`add-${i}`}
              className="aspect-square rounded-xl border-2 border-dashed border-white/[0.15] bg-white/[0.02] flex items-center justify-center hover:border-white/30 transition"
            >
              <Plus className="h-5 w-5 text-[#A09AB0]" />
            </div>
          ))}
          {emptySlots > 0 && (
            <label
              className="aspect-square rounded-xl border-2 border-dashed border-white/[0.15] bg-white/[0.02] flex items-center justify-center cursor-pointer hover:border-white/30 transition"
            >
              <Plus className="h-5 w-5 text-[#A09AB0]" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAddPhoto}
                aria-label="Add photo"
              />
            </label>
          )}
        </div>

        <p className="mt-3 text-xs text-[#A09AB0]">
          The first photo is your main profile photo. Tap a photo to make it main.
        </p>
      </section>

      <section className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Basic info</h2>
        <div className="grid gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#A09AB0] uppercase">Display name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData((d) => ({ ...d, displayName: e.target.value }))}
              maxLength={50}
              className="h-10 rounded-xl border border-white/[0.15] bg-surface px-3 text-sm text-white focus:border-brand-500/60 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#A09AB0] uppercase">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData((d) => ({ ...d, gender: e.target.value }))}
              className="h-10 rounded-xl border border-white/[0.15] bg-surface px-3 text-sm text-white focus:border-brand-500/60 focus:outline-none"
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#A09AB0] uppercase">Date of birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData((d) => ({ ...d, dateOfBirth: e.target.value }))}
              className="h-10 rounded-xl border border-white/[0.15] bg-surface px-3 text-sm text-white focus:border-brand-500/60 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#A09AB0] uppercase">Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData((d) => ({ ...d, country: e.target.value }))}
              maxLength={60}
              className="h-10 rounded-xl border border-white/[0.15] bg-surface px-3 text-sm text-white focus:border-brand-500/60 focus:outline-none"
              placeholder="e.g. Nigeria"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">About me</h2>
          <span className="text-xs text-[#A09AB0]">{formData.bio.length}/250</span>
        </div>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData((d) => ({ ...d, bio: e.target.value.slice(0, 250) }))}
          maxLength={250}
          rows={4}
          className="w-full resize-none rounded-xl border border-white/[0.15] bg-surface px-3 py-2.5 text-sm text-white focus:border-brand-500/60 focus:outline-none"
          placeholder="Tell people what makes you, you."
        />
      </section>

      <section className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Interests</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={handleInterestKeyDown}
            maxLength={30}
            placeholder="Add an interest…"
            className="flex-1 h-10 rounded-xl border border-white/[0.15] bg-surface px-3 text-sm text-white focus:border-brand-500/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => { addInterest(newInterest); setNewInterest(""); }}
            disabled={!newInterest.trim() || formData.interests.includes(newInterest.trim())}
            className="rounded-xl border border-brand-500/60 bg-brand-500/15 px-3 text-sm font-medium text-brand-200 hover:bg-brand-500/20 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.interests.map((interest) => (
            <Chip key={interest} tone="brand" className="flex items-center gap-1.5">
              {interest}
              <button
                type="button"
                onClick={() => removeInterest(interest)}
                className="rounded-full p-0.5 text-[#A09AB0] hover:bg-white/10"
                aria-label={`Remove ${interest}`}
              >
                <ChevronRight className="h-3 w-3 rotate-45" />
              </button>
            </Chip>
          ))}
          {formData.interests.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {INTEREST_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addInterest(suggestion)}
                  className="rounded-full border border-white/[0.15] bg-surface px-3 py-1.5 text-xs font-medium text-[#A09AB0] transition hover:border-white/30 hover:bg-white/05"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="pt-2">
        <Button
          type="button"
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}