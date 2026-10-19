"use client";
import { useCallback, useEffect, useState } from "react";
import { X, Check, Palette, Gamepad2 } from "lucide-react";
import { LUDO_COLORS } from "@/lib/ludo/engine";
import { getSupabaseClient } from "@/lib/supabase/client";

/** The 20 collectible animal head shapes members can wear as their Ludo seed. */
export type LudoSeedAnimal = {
  /** Stable key written to `profiles.ludo_seed`. */
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

/** Preset colour swatches (the four board quadrant colours first). */
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
    setColor(foundEmotionalColor(key));
  };

  function foundEmotionalColor(key: string): string {
    const map: Record<string, string> = {
      lion: "#F59E0B", tiger: "#F97316", leopard: "#7C3AED", elephant: "#6B7280",
      wolf: "#1F2937", dragon: "#DC2626", bear: "#92400E", eagle: "#0891B2",
      panther: "#111827", bull: "#B91C1C", rhino: "#4B5563", hippo: "#78716C",
      crocodile: "#15803D", gorilla: "#3F3F46", kangaroo: "#C026D3", panda: "#F1F5F9",
      zebra: "#334155", fox: "#EA580C", owl: "#6366F1", shark: "#0EA5E9",
    };
    return map[key] ?? LUDO_COLORS[0]!;
  }

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

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seed-customizer-title"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close seed customizer"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-300"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="seed-customizer-title" className="text-lg font-black tracking-tight">
            Customize your seed
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 text-white/50 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Animal selection */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-white/50">
            Animal shape
          </p>
          <div className="grid grid-cols-5 gap-2">
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
                      ? "border-2 border-amber-300 bg-amber-900/30 shadow-[0_0_16px_rgba(251,191,36,.35)]"
                      : "border border-white/10 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  <span className="text-2xl leading-none">{a.emoji}</span>
                  <span className="text-[10px] font-semibold">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Colour selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-wider text-white/50">
              Seed colour
            </p>
            <button
              type="button"
              aria-label="Open colour picker"
              onClick={() => {
                const input = document.getElementById("seed-color-picker");
                input?.click();
              }}
              className="flex items-center gap-1 rounded bg-white/8 px-2 py-1 text-xs font-bold text-white hover:bg-white/12 transition"
            >
              <Palette className="h-3 w-3" /> Pick custom
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SEED_COLORS.map((value) => {
              const active = color === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickColor(value)}
                  className={`h-6 w-6 rounded-full border ring-offset-2 transition ${
                    active
                      ? "ring-2 ring-white ring-offset-white/5"
                      : "border-white/20 hover:border-white/50"
                  }`} style={{ background: value }} />
              );
            })}
            {/* Native colour picker (hidden input, triggered by the button above). */}
            <input
              id="seed-color-picker"
              type="color"
              defaultValue={customColor}
              className="sr-only"
              onChange={(e) => pickColor(e.target.value)}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-white/50">
            Preview
          </p>
          <div className="flex items-center gap-3">
            <span
              className={`text-6xl leading-none drop-shadow-lg ${
                SEED_ANIMALS.find((a) => a.key === animal)?.emoji ?? "🦁"
              }`}
              style={{ filter: `drop-shadow(0 0 12px ${color})` }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold">
                {SEED_ANIMALS.find((a) => a.key === animal)?.label}
              </span>
              <span className="text-[10px] text-white/50">{color}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/8 px-3 py-2.5 text-sm font-black text-white/75 transition hover:bg-white/12 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-3 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_8px_24px_rgba(249,115,22,.45)] transition active:scale-[.98] disabled:opacity-60"
          >
            {saved ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Gamepad2 className="h-3.5 w-3.5 mr-1.5" />}
            {saving ? "Saving…" : saved ? "Saved" : "Save seed"}
          </button>
        </div>

        {saved && !saving && (
          <p className="mt-3 text-[10px] text-emerald-400 font-semibold text-center">
            Seed saved — it will appear in your next match.
          </p>
        )}
      </div>
    </div>
  );
}

