"use client";
import { useState } from "react";
import { Wrench, ShieldAlert, Sparkles, Navigation, Fuel, Settings } from "lucide-react";

export interface SelectedCar {
  id: string;
  name: string;
  speed: number;
  accel: number;
  armor: number;
  color: string;
}

export interface SelectedTrack {
  id: string;
  name: string;
  surface: "asphalt" | "wet" | "cyber";
  bg: string;
}

export interface RaceUpgrades {
  nitro: number;
  armor: number;
}

const CARS: SelectedCar[] = [
  { id: "phantom", name: "Cyber Phantom GT", speed: 280, accel: 85, armor: 100, color: "#22d3ee" },
  { id: "hyperion", name: "Monaco Hyperion V12", speed: 320, accel: 95, armor: 80, color: "#f59e0b" },
  { id: "veloce", name: "Veloce Apex Stradale", speed: 350, accel: 98, armor: 90, color: "#e11d48" },
];

const CITIES: SelectedTrack[] = [
  { id: "lagos", name: "Lagos Coastal Expressway", surface: "asphalt", bg: "from-amber-950/80 to-slate-950" },
  { id: "tokyo", name: "Tokyo Cyber Expressway", surface: "wet", bg: "from-purple-950/80 to-slate-950" },
  { id: "monaco", name: "Monaco Grand Riviera", surface: "cyber", bg: "from-cyan-950/80 to-slate-950" },
];

const UPGRADES = [
  { id: "nitro", label: "NITRO TANK", icon: Fuel, cost: 4000, max: 3, blurb: "+25% nitro capacity per stage" },
  { id: "armor", label: "ARMOR PLATING", icon: ShieldAlert, cost: 6000, max: 3, blurb: "Absorbs one crash impact per stage" },
] as const;

export function RacingHub({
  onLaunchRace,
  coins,
  onSpend,
}: {
  onLaunchRace: (car: SelectedCar, track: SelectedTrack, upgrades: RaceUpgrades) => void;
  coins?: number;
  onSpend?: (cost: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<"garage" | "mechanic" | "tracks">("garage");
  const [selectedCar, setSelectedCar] = useState<SelectedCar>(CARS[0]!);
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack>(CITIES[0]!);
  const [chassisHealth, setChassisHealth] = useState(100);
  const [upgrades, setUpgrades] = useState<RaceUpgrades>({ nitro: 0, armor: 0 });

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4 text-white select-none pb-12 font-sans">
      
      {/* ── TOP CURRENCY & STATUS HEADER ──────────────────────────── */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
          <span className="text-xs font-black tracking-widest text-cyan-300">APEX 4D GARAGE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-black/50 px-3 py-1">
            <span>🪙</span>
            <span className="text-xs font-black text-amber-300">{coins !== undefined ? coins.toLocaleString() : "169.7M"}</span>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS (Garage / Mechanic / City Tracks) ────── */}
      <div className="my-4 grid grid-cols-3 gap-2">
        {[
          { id: "garage", label: "DEALERSHIP", icon: "🏎‍🟀" },
          { id: "mechanic", label: "MECHANIC", icon: "🛠️" },
          { id: "tracks", label: "CITIES", icon: "🌆" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 backdrop-blur-md transition active:scale-95 ${
              activeTab === tab.id
                ? "border-cyan-400 bg-cyan-950/50 shadow-lg shadow-cyan-500/20 text-cyan-300"
                : "border-white/10 bg-white/5 text-slate-400"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="mt-1 text-[9px] font-black tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── GARAGE DEALERSHIP SHOWROOM ────────────────────────────── */}
      {activeTab === "garage" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/40 to-slate-950 p-5 shadow-2xl backdrop-blur-xl">
            <span className="text-[10px] font-black tracking-widest text-cyan-400">SELECTED HYPERCAR</span>
            <h2 className="text-xl font-black text-white">{selectedCar.name}</h2>

            <div className="my-6 flex h-28 items-center justify-center rounded-2xl border border-white/10 bg-black/40">
              <div
                className="h-12 w-28 rounded-2xl shadow-2xl transition-all"
                style={{ backgroundColor: selectedCar.color, boxShadow: `0 0 30px ${selectedCar.color}` }}
              />
            </div>

            {/* Telemetry Stats */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>MAX SPEED</span>
                  <span className="text-cyan-300">{selectedCar.speed} KM/H</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-900">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${(selectedCar.speed / 400) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>ACCELERATION</span>
                  <span className="text-amber-300">{selectedCar.accel}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-900">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${selectedCar.accel}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>ARMOR RATING</span>
                  <span className="text-emerald-300">{selectedCar.armor}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-900">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${selectedCar.armor}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Car Selector Grid */}
          <div className="grid grid-cols-3 gap-2">
            {CARS.map((car) => (
              <button
                key={car.id}
                type="button"
                onClick={() => setSelectedCar(car)}
                className={`flex flex-col items-center rounded-2xl border p-3 transition ${
                  selectedCar.id === car.id ? "border-amber-400 bg-amber-500/10 shadow-lg" : "border-white/10 bg-white/5"
                }`}
              >
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: car.color }} />
                <span className="mt-1 text-[10px] font-black text-white text-center">{car.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MECHANIC WORKSHOP ─────────────────────────────────────── */}
      {activeTab === "mechanic" && (
        <div className="flex flex-col gap-4 rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-amber-400">
            <Wrench className="h-5 w-5" />
            <h3 className="text-sm font-black tracking-wider">CHASSIS & ENGINE WORKSHOP</h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex justify-between text-xs font-bold">
              <span>Structural Chassis Health</span>
              <span className={chassisHealth < 50 ? "text-rose-400" : "text-emerald-400"}>{chassisHealth}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${chassisHealth < 50 ? "bg-rose-500" : "bg-emerald-400"}`}
                style={{ width: `${chassisHealth}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (chassisHealth >= 100) return;
              if (coins !== undefined && coins < 5000) return;
              onSpend?.(5000);
              setChassisHealth(100);
            }}
            disabled={chassisHealth >= 100 || (coins !== undefined && coins < 5000)}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-xs font-black text-slate-950 shadow-lg transition active:scale-95 disabled:opacity-40"
          >
            {chassisHealth >= 100 ? "CHASSIS FULLY REPAIRED" : "REPAIR CHASSIS (5,000 🪙)"}
          </button>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-bold text-slate-300">PERFORMANCE UPGRADES</p>
            </div>
            <div className="mt-3 space-y-3">
              {UPGRADES.map((u) => {
                const level = upgrades[u.id];
                const maxed = level >= u.max;
                const affordable = coins === undefined || coins >= u.cost;
                const Icon = u.icon;
                return (
                  <div key={u.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-amber-400" />
                        <span className="text-[11px] font-black text-white">{u.label}</span>
                        <span className="flex gap-1">
                          {Array.from({ length: u.max }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-1.5 w-1.5 rounded-full ${i < level ? "bg-amber-400" : "bg-slate-700"}`}
                            />
                          ))}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={maxed || !affordable}
                        onClick={() => {
                          if (maxed || !affordable) return;
                          onSpend?.(u.cost);
                          setUpgrades((prev) => ({ ...prev, [u.id]: prev[u.id] + 1 } as RaceUpgrades));
                        }}
                        className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-300 transition active:scale-95 disabled:opacity-40"
                      >
                        {maxed ? "MAX" : `${u.cost.toLocaleString()} 🪙`}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[9px] font-bold text-slate-500">{u.blurb}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CITY TRACK SELECTION ─────────────────────────────────── */}
      {activeTab === "tracks" && (
        <div className="flex flex-col gap-3">
          {CITIES.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => setSelectedTrack(city)}
              className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                selectedTrack.id === city.id
                  ? "border-cyan-400 bg-gradient-to-r from-cyan-950 to-slate-900 shadow-lg shadow-cyan-500/20"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="text-left">
                <p className="text-xs font-black text-white">{city.name}</p>
                <span className="text-[10px] font-bold text-cyan-300 uppercase">Surface: {city.surface}</span>
              </div>
              <Navigation className="h-5 w-5 text-cyan-400" />
            </button>
          ))}
        </div>
      )}

      {/* ── LAUNCH RACE BUTTON ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => onLaunchRace(selectedCar, selectedTrack, upgrades)}
        className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-4 text-xs font-black tracking-widest text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition hover:scale-[1.02] active:scale-95"
      >
        LAUNCH 4D RACE ({selectedTrack.name.toUpperCase()})
      </button>
    </div>
  );
}