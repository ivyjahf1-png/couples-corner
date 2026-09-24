'use client';

import React, { useState } from 'react';
import { Crown, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const eliteTiers = [
  {
    name: 'Knight',
    price: '$9.99 / mo or 10,000 ¢',
    colorClass: 'bg-blue-600',
    mascot: '🛡️',
    perks: ['Special profile badge', '10 free super likes daily', 'See who liked you', 'Priority message delivery'],
  },
  {
    name: 'Baron',
    price: '$24.99 / mo or 25,000 ¢',
    colorClass: 'bg-emerald-600',
    mascot: '🦁',
    perks: ['Everything in Knight', 'Unlimited rewinds', 'Incognito browsing mode', 'Featured profile boost weekly'],
  },
  {
    name: 'Monarch',
    price: '$59.99 / mo or 60,000 ¢',
    colorClass: 'bg-amber-600',
    mascot: '👑',
    highlighted: true,
    perks: ['Everything in Baron', 'Exclusive VIP lounge access', 'Direct chat with any user', 'Personalized matching concierge'],
  },
];

export default function AristocracyPage() {
  const router = useRouter();
  const [activeTier, setActiveTier] = useState(2);

  const current = eliteTiers[activeTier];

  return (
    <div className="min-h-screen bg-[#0b061d] text-white p-4 font-sans pb-24 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <button onClick={() => router.back()} className="p-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-white">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-xl font-bold tracking-wide">Aristocracy Center</h1>
        </div>
        <div className="bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-bold text-amber-300 flex items-center gap-1">
          <Crown className="w-3.5 h-3.5" /> VIP Tiers
        </div>
      </div>

      {/* Tier Selector Horizontal Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-3 mb-6">
        {eliteTiers.map((tier, idx) => (
          <button
            key={tier.name}
            onClick={() => setActiveTier(idx)}
            className={"px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all shadow-lg " + (activeTier === idx ? "bg-amber-500 text-black scale-105 border border-white/30" : "bg-indigo-950/60 text-indigo-300 border border-indigo-500/20")}
          >
            {tier.mascot + " " + tier.name}
          </button>
        ))}
      </div>

      {/* Active Tier Showcase Card */}
      <div className="relative rounded-3xl p-6 bg-indigo-950/80 border border-amber-500/30 shadow-2xl mb-6 overflow-hidden flex flex-col items-center text-center">
        <div className="absolute -right-6 -bottom-6 opacity-10 text-9xl">
          {current.mascot}
        </div>
        <div className="w-20 h-20 rounded-full bg-black/30 border-2 border-amber-400/40 flex items-center justify-center text-4xl shadow-xl mb-3">
          {current.mascot}
        </div>
        <h2 className="text-2xl font-black tracking-wider uppercase mb-1">{current.name + " Status"}</h2>
        <p className="text-xs text-indigo-200 mb-4">Unlock elite standing and exclusive relationship perks</p>
        
        <div className="text-base font-extrabold text-amber-300 bg-black/40 px-4 py-1.5 rounded-xl border border-amber-400/30 mb-6">
          {current.price}
        </div>

        {/* Perks list */}
        <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl p-4 mb-6 border border-indigo-500/20 text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block mb-2">Included Privileges:</span>
          <ul className="flex flex-col gap-2">
            {current.perks.map((perk, pIdx) => (
              <li key={pIdx} className="flex items-center gap-2 text-xs text-white/90">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button className="bg-indigo-900/60 hover:bg-indigo-900 text-white font-bold py-2.5 rounded-xl text-xs border border-indigo-500/30 transition">
            Give Away
          </button>
          <button className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-2.5 rounded-xl text-xs shadow-lg transition">
            Activate Now
          </button>
        </div>
      </div>

      {/* Exclusive Visual Privileges Grid */}
      <h3 className="text-sm font-bold text-indigo-200 mb-3 uppercase tracking-wider">Aesthetic & Profile Effects</h3>
      <div className="grid grid-cols-3 gap-3">
        {['Identity Mark', 'Custom Medal', 'Avatar Frame', 'Bubble Box', 'Entry Effect', 'Renewal Bonus'].map((priv, idx) => (
          <div key={idx} className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-3 flex flex-col items-center text-center shadow">
            <Sparkles className="w-5 h-5 text-amber-400 mb-1.5" />
            <span className="text-[11px] font-semibold text-indigo-100">{priv}</span>
          </div>
        ))}
      </div>
    </div>
  );
}