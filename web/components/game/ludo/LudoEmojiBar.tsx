"use client";
import React from "react";
import { soundEngine } from "./soundEngine";

const EMOJIS = ["😂", "😡", "👏", "😍", "🍀", "🔥", "👍", "😭"];

interface EmojiBarProps {
  onSendEmoji?: (emoji: string) => void;
}

export const LudoEmojiBar: React.FC<EmojiBarProps> = ({ onSendEmoji }) => {
  const handleEmojiClick = (emoji: string) => {
    // 1. Play spatial sound FX + commentator voice
    soundEngine.playEmojiAudio(emoji);

    // 2. Broadcast emoji to match room
    if (onSendEmoji) {
      onSendEmoji(emoji);
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto flex items-center justify-center gap-1.5 p-2 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl backdrop-blur-md">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleEmojiClick(emoji)}
          className="text-xl sm:text-2xl p-1.5 rounded-xl hover:bg-white/10 active:scale-125 transition transform"
          aria-label={`Send emoji ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default LudoEmojiBar;