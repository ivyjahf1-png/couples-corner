"use client";
import { useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const EMOJIS = ["😂", "😡", "👏", "😍", "🍀", "🔥", "👍", "😭"];

export function ChatOverlay({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Array<{ who: string; text: string }>>([{ who: "CPU Blue", text: "Good luck! 🍀" }]);
  const [draft, setDraft] = useState("");
  function send(text: string) {
    const t = text.trim().slice(0, 60);
    if (!t) return;
    setMsgs((m) => [...m.slice(-19), { who: "You", text: t }]);
    setDraft("");
    if (isSupabaseConfigured()) {
      const sb = getSupabaseClient();
    const insertP = sb.from("ludo_messages").insert({ match_id: matchId, text: t });
    void Promise.resolve(insertP).catch(() => undefined);
    }
  }
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f172a]/80 p-4 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,.5)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-white">Match Chat</p>
        <button type="button" onClick={onClose} className="text-xs font-bold text-white/60">Close</button>
      </div>
      <ul className="mt-2 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
        {msgs.map((m, i) => (<li key={i} className="text-xs text-white/85"><span className="font-bold text-amber-300">{m.who}: </span>{m.text}</li>))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EMOJIS.map((e) => (<button key={e} type="button" onClick={() => send(e)} className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-base">{e}</button>))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(ev) => { ev.preventDefault(); send(draft); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Say something…" maxLength={60}
          className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white" />
        <button type="submit" className="h-10 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-4 text-sm font-black text-white shadow-[0_4px_14px_rgba(249,115,22,.5)]">Send</button>
      </form>
    </div>
  );
}

export function CallButton({ channelName }: { channelName: string }) {
  return (
    <a href={`/call/${encodeURIComponent(channelName)}`}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_0_14px_rgba(16,185,129,.5)]" aria-label="Voice call during play">📞</a>
  );
}
