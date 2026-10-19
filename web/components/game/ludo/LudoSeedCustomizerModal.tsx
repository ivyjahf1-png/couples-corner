"use client";
import { useCallback, useEffect, useState } from "react";
import { X, Check, Palette, Gamepad2 } from "lucide-react";
import { LUDO_COLORS } from "@/lib/ludo/engine";
import { getSupabaseClient } from "@/lib/supabase/client";

/** The 20 collectible animal head shapes members can wear as their Ludo seed. */
export type LudoSeedAnimal = {
  key: string;
  emoji: string;
  label: string;
};

export const SEED_ANIMALS: LudoSeedAnimal[] = [
  { key: "lion", emoji: "🦁", label: "Lion" },
  { key: "tiger", emoji: "🐅", label: "Tiger" },
  { key: "leopard", emoji: "🐆", label: "Leopard" },
  { key: "elephant", emoji: "🐘", label: "Elephant" },
  { key: "wolf", emoji: "🐺", label: "Wolf" },
  { key: "dragon", emoji: "🐉", label: "Dragon" },
  { key: "bear", emoji: "🐻", label: "Bear" },
  { key: "eagle", emoji: "🦅", label: "Eagle" },
  { key: "panther", emoji: "🐈‍⬛", label: "Panther" },
  { key: "bull", emoji: "🐂", label: "Bull" },
  { key: "rhino", emoji: "🦏", label: "Rhino" },
  { key: "hippo", emoji: "🦛", label: "Hippo" },
  { key: "crocodile", emoji: "🐊", label: "Crocodile" },
  { key: "gorilla", emoji: "🦍", label: "Gorilla" },
  { key: "kangaroo", emoji: "🦘", label: "Kangaroo" },
  { key: "panda", emoji: "🐼", label: "Panda" },
  { key: "zebra", emoji: "🦓", label: "Zebra" },
  { key: "fox", emoji: "🦊", label: "Fox" },
  { key: "owl", emoji: "🦉", label: "Owl" },
  { key: "shark", emoji: "🦈", label: "Shark" },
] as const;

const SEED_COLORS: string[] = [
  ...LUDO_COLORS,
  "#6366f1", // indigo
  "#a855f7", // purple
  "#db2777", // pink
  "#ef4444", // red
  "#f97316", // orange
];

export interface LudoSeedCustomizerModalProps {
  open: boolean;
  onClose: () => void;
  currentAnimal: string | null;
  currentColor: string | null;
  onSave: (animal: string, color: string) => void;
}

export function LudoSeedCustomizerModal({
  open,
  onClose,
  currentAnimal,
  currentColor,
  onSave,
}: LudoSeedCustomizerModalProps) {
  const [animal, setAnimal] = useState(currentAnimal ?? "lion");
  const [color, setColor] = useState(currentColor ?? LUDO_COLORS[0]!);
  const [customColor, setCustomColor] = useState(currentColor ?? LUDO_COLORS[0]!);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAnimal(currentAnimal ?? "lion");
    setColor(currentColor ?? LUDO_COLORS[0]!);
    setCustomColor(currentColor ?? LUDO_COLORS[0]!);
    setSaved(false);
  }, [open, currentAnimal, currentColor]);

  const selectAnimal = (key: string) => {
    setAnimal(key);
  };

  const pickColor = (value: string) => {
    setColor(value);
    setCustomColor(value);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb.auth.getUser();
      if (error || !data.user) throw new Error("Not signed in");
      const { error: updError } = await sb
        .from("profiles")
        .update({ ludo_seed: animal, ludo_seed_color: color })
        .eq("user_id", data.user.id);
      if (updError) throw updError;
      setSaved(true);
      onSave(animal, color);
    } catch (err) {
      console.error("Failed to save Ludo seed customization:", err);
    } finally {
      setSaving(false);
    }
  }, [animal, color, onSave]);

  if (!open) return null;

  const selectedAnimalObj = SEED_ANIMALS.find((a) => a.key === animal) ?? SEED_ANIMALS[0]!;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seed-customizer-title"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close seed customizer"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
      />
      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="seed-customizer-title" className="text-lg font-black tracking-tight">
            AAA 5D Seed Customizer
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 text-white/50 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Tall & Slim 3D Pawn Preview Box */}
        <div className="mb-5 flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-b from-white/5 to-white/0 p-5 shadow-inner">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-amber-400">
            Live Tall & Slim 3D Preview
          </p>
          
          {/* Tall & Slim Multi-Tiered Pawn Figure */}
          <div className="relative flex flex-col items-center justify-end w-16 h-32 my-1">
            {/* Ground Shadow */}
            <span className="absolute bottom-0 h-2.5 w-12 rounded-[50%] bg-black/70 blur-[1.5px]" />

            {/* Glossy Spherical Head with Animal Emoji */}
            <span
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 shadow-md"
              style={{
                background: `radial-gradient(circle at 32% 28%, #ffffff 0%, ${color} 60%, rgba(0,0,0,0.7) 100%)`,
              }}
            >
              <span className="text-lg drop-shadow-sm select-none">{selectedAnimalObj.emoji}</span>
            </span>

            {/* Upper Slim Conical Tier */}
            <span
              className="relative -mt-0.5 h-8 w-8 border-x border-white/30 shadow-inner"
              style={{
                clipPath: "polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)",
                background: `linear-gradient(90deg, rgba(0,0,0,0.35), ${color} 50%, rgba(255,255,255,0.45))`,
              }}
            />

            {/* Lower Slim Conical Tier */}
            <span
              className="relative -mt-0.5 h-9 w-12 border-x border-white/30 shadow-inner"
              style={{
                clipPath: "polygon(22% 0%, 78% 0%, 100% 100%, 0% 100%)",
                background: `linear-gradient(90deg, rgba(0,0,0,0.4), ${color} 50%, rgba(255,255,255,0.35))`,
              }}
            />

            {/* Slim Weighted Base */}
            <span
              className="relative -mt-0.5 h-4 w-16 rounded-full border border-white/60 shadow-xl"
              style={{
                background: `linear-gradient(180deg, ${color} 0%, rgba(0,0,0,0.7) 100%)`,
              }}
            />
          </div>

          <span className="mt-2 text-sm font-extrabold text-white/90">
            {selectedAnimalObj.label} Pawn
          </span>
        </div>

        {/* Animal Shape Selection Grid */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-white/50">
            Choose Animal Head Shape
          </p>
          <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto pr-1">
            {SEED_ANIMALS.map((a) => {
              const active = animal === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={active}
                  aria-label={a.label}
                  onClick={() => selectAnimal(a.key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
                    active
                      ? "border-2 border-amber-400 bg-amber-500/20 shadow-[0_0_14px_rgba(251,191,36,.4)]"
                      : "border border-white/10 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  <span className="text-xl leading-none">{a.emoji}</span>
                  <span className="text-[9px] font-semibold truncate w-full text-center">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Colour Selection */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-wider text-white/50">
              Seed Colour Scheme
            </p>
            <button
              type="button"
              onClick={() => document.getElementById("seed-color-picker")?.click()}
              className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              <Palette className="h-3 w-3" /> Custom Hex
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SEED_COLORS.map((value) => {
              const active = color === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickColor(value)}
                  className={`h-7 w-7 rounded-full border ring-offset-2 transition ${
                    active
                      ? "ring-2 ring-amber-300 ring-offset-slate-900 scale-110"
                      : "border-white/20 hover:scale-105"
                  }`}
                  style={{ background: value }}
                />
              );
            })}
            <input
              id="seed-color-picker"
              type="color"
              value={customColor}
              className="sr-only"
              onChange={(e) => pickColor(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-black text-white/80 transition hover:bg-white/15 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_6px_20px_rgba(249,115,22,.5)] transition active:scale-[.98] disabled:opacity-60"
          >
            {saved ? <Check className="h-4 w-4 inline mr-1" /> : <Gamepad2 className="h-4 w-4 inline mr-1" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Seed"}
          </button>
        </div>

        {saved && !saving && (
          <p className="mt-3 text-[11px] text-emerald-400 font-bold text-center animate-pulse">
            Seed customized successfully! It will appear in your matches.
          </p>
        )}
      </div>
    </div>
  );
}