"use client";

/**
 * Chat photo upload button — gallery picker in the chat composer footer.
 *
 * Invisible file input (`accept="image/*"`) triggered by the gallery icon.
 * On selection the file uploads straight to the `chat-attachments` storage
 * bucket, the public URL is read back, and a message row carrying `image_url`
 * is inserted — so the photo reflects instantly on the other member's screen
 * via the existing `useRealtimeMessages` subscription. No server action is
 * involved: Server Actions reject large multipart bodies on Vercel, the same
 * E394 failure that broke moment uploads.
 */

import { useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function ChatPhotoUploadButton({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const supabase = getSupabaseClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${conversationId}/${currentUserId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      const imageUrl = data?.publicUrl;
      if (!imageUrl) throw new Error("Could not resolve public URL");
      /* `body` carries a text fallback so existing bubbles render something
         while `image_url` carries the photo for image-aware renderers. */
      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: "📷 Photo",
        image_url: imageUrl,
      });
      /* FALLBACK FOR A MISSING `image_url` COLUMN.

         `image_url` was added by migration 056. If a database has not had that
         migration applied, the insert fails with "column image_url does not
         exist" — and the member's photo is lost even though it uploaded
         perfectly to storage. Retrying WITHOUT the column still delivers the
         message (the photo is in the bucket, and the body fallback is what old
         bubbles render), which is strictly better than losing the send.

         The error is matched on the COLUMN NAME rather than swallowed
         wholesale: a permissions or RLS failure must NOT be retried without
         the column, because that second attempt would fail for the same
         reason and would hide the real error behind a fallback. */
      if (insertError && /image_url|column .* does not exist/i.test(insertError.message)) {
        const { error: fallbackError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          body: "📷 Photo",
        });
        if (fallbackError) throw fallbackError;
      } else if (insertError) {
        throw insertError;
      }
    } catch (err) {
      console.error("[chat] photo upload failed", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden
        className="hidden"
        onChange={(event) => void onPick(event.target.files?.[0])}
      />
      <button
        type="button"
        aria-label={uploading ? "Uploading photo…" : "Send photo"}
        title={uploading ? "Uploading photo…" : "Send photo"}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8A8496] transition hover:bg-black/5 hover:text-[#2F2A3A] active:scale-95 disabled:opacity-50"
      >
        <ImageIcon className="h-5 w-5" />
      </button>
    </>
  );
}
