// LiveChatThread.tsx — merged server + realtime message stream with seeded starter.

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Image as ImageIcon,
  Mic,
  Gift,
  Smile,
  Send,
  Phone,
  Video,
  AlertTriangle,
  X,
  Volume2,
} from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  gift_id?: string | null;
}

interface LiveChatThreadProps {
  conversationId: string;
  recipient: {
    id: string;
    name: string;
    avatarUrl?: string;
    isOnline?: boolean;
  };
  currentUser: {
    id: string;
    coins: number;
  };
  initialMessages?: Message[];
  onSendMessageAction?: (
    content: string,
    giftId?: string
  ) => Promise<{ success: boolean; error?: string; remainingCoins?: number }>;
}

export function LiveChatThread({
  conversationId,
  recipient,
  currentUser,
  initialMessages = [],
  onSendMessageAction,
}: LiveChatThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [userCoins, setUserCoins] = useState(currentUser.coins);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss error banner after 4 seconds so it doesn't block the chat controls
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // 2. Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, errorMessage]);

  // 3. Auto-expanding Textarea height handler
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  };

  // 4. Send Message Handler with Explicit Error Capture
  const handleSend = async (messageText?: string) => {
    const payload = (messageText || text).trim();
    if (!payload || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (onSendMessageAction) {
        const res = await onSendMessageAction(payload);
        if (!res.success) {
          setErrorMessage(
            res.error || "Message declined. Please check your coin balance."
          );
          setIsSubmitting(false);
          return;
        }
        if (typeof res.remainingCoins === "number") {
          setUserCoins(res.remainingCoins);
        }
      } else {
        // Fallback API Route Call
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            recipientId: recipient.id,
            content: payload,
            messageCost: 10,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(
            data.error || "Could not send message. Please try again."
          );
          setIsSubmitting(false);
          return;
        }

        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        if (typeof data.remainingCoins === "number") {
          setUserCoins(data.remainingCoins);
        }
      }

      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err: any) {
      setErrorMessage(
        "Network connection failed. Please check your signal and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col overflow-hidden h-[100dvh] bg-[#0F172A] text-white">
      {/* HEADER BAR */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0F172A]/90 px-4 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-slate-800">
              {recipient.avatarUrl ? (
                <img
                  src={recipient.avatarUrl}
                  alt={recipient.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-amber-300">
                  {recipient.name[0]?.toUpperCase()}
                </div>
              )}
              {recipient.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0F172A]" />
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-bold text-white leading-tight">
                {recipient.name}
              </span>
              <span className="text-[11px] text-white/50">
                {recipient.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/70">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition"
          >
            <Video className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CHAT MESSAGES SCROLL AREA */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 space-y-3 overscroll-contain">
        {/* Scam Warning Banner */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200/90 leading-relaxed">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            This user might be trying to scam you. Watch out for asks for money,
            personal details, or weird links. Be careful!
          </span>
        </div>

        {/* Message History */}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUser.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isMine ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-md ${
                  isMine
                    ? "bg-[#FF5722] text-white rounded-br-none"
                    : "bg-slate-800 text-white/90 border border-white/10 rounded-bl-none"
                }`}
              >
                {msg.content}
              </div>
              <span className="mt-1 text-[10px] text-white/40 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ERROR BANNER (sits just above the docked input bar) */}
      {errorMessage && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300">
          <span className="leading-tight pr-2">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 text-red-300/70 hover:text-red-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* INPUT & FOOTER BAR (DOCKED ABOVE MOBILE KEYBOARD) */}
      <div className="sticky bottom-0 left-0 right-0 z-30 w-full shrink-0 border-t border-white/10 bg-[#0F172A] px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">

        {/* Quick Suggestion Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar text-xs">
          {["hey dear are you single?", "Nice to meet you", "Good day!"].map(
            (chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSend(chip)}
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 whitespace-nowrap text-white/80 transition hover:border-[#FF5722]/50 hover:bg-white/10 active:scale-95"
              >
                {chip}
              </button>
            )
          )}
        </div>

        {/* Row 2 — Attachment, Mic, Gift, text input, Emoji, Send */}
        <div className="flex items-center gap-2">
          {/* Media / action buttons */}
          <div className="flex items-center gap-1 text-white/60">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white"
              aria-label="Attach photo"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-amber-400"
              aria-label="Record voice"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-amber-400"
              aria-label="Send gift"
            >
              <Gift className="h-5 w-5" />
            </button>
          </div>

          {/* Fluid auto-expanding text box */}
          <div className="flex flex-1 min-w-0 items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 px-3 py-2 transition-all focus-within:border-[#FF5722] shadow-inner">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isSubmitting}
              className="w-full resize-none bg-transparent py-0.5 text-sm leading-relaxed text-white placeholder-white/40 focus:outline-none max-h-28 overflow-y-auto"
            />
            <button
              type="button"
              className="text-white/40 transition hover:text-white pb-0.5"
              aria-label="Emoji picker"
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!text.trim() || isSubmitting}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
              text.trim() && !isSubmitting
                ? "bg-[#FF5722] text-white shadow-[#FF5722]/30"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            <Send className="h-4 w-4 fill-current ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}