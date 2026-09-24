'use client';

import React, { useState } from 'react';
import { ChevronRight, CheckCircle2, Gift, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

const initialTasks = [
  { id: 1, title: 'Daily Check-in', reward: '+100 ¢', completed: false, category: 'Daily' },
  { id: 2, title: 'Complete Your Profile', reward: '+500 ¢', completed: true, category: 'Newcomer' },
  { id: 3, title: 'Send 5 Messages', reward: '+250 ¢', completed: false, category: 'Daily' },
  { id: 4, title: 'Play a Round of Ludo', reward: '+300 ¢', completed: false, category: 'Daily' },
  { id: 5, title: 'Upload a Moment Post', reward: '+400 ¢', completed: false, category: 'Newcomer' },
];

export default function TaskCenterPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);

  const handleClaim = (id: number) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, completed: true } : task));
  };

  return (
    <div className="min-h-screen bg-[#0b061d] text-white p-4 font-sans pb-24 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <button onClick={() => router.back()} className="p-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-white">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-xl font-bold tracking-wide">Task Center</h1>
        </div>
        <div className="bg-orange-500/20 border border-orange-400/40 px-3 py-1 rounded-full text-xs font-bold text-orange-300 flex items-center gap-1">
          <Gift className="w-3.5 h-3.5" /> Rewards
        </div>
      </div>

      {/* Rewards Banner */}
      <div className="relative rounded-3xl p-6 bg-gradient-to-br from-orange-600/30 via-amber-600/20 to-purple-900/40 border border-amber-500/30 shadow-2xl mb-6 overflow-hidden flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Newcomer & Daily</span>
          <h2 className="text-xl font-black text-white mt-0.5">Earn Coins & Bonuses</h2>
          <p className="text-xs text-ink-300 mt-1 max-w-[200px]">Complete tasks daily to unlock exclusive perks and level up.</p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl shadow-lg">
          🎁
        </div>
      </div>

      {/* Task List */}
      <h3 className="text-sm font-bold text-indigo-200 mb-3 uppercase tracking-wider">Available Tasks</h3>
      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-900/60 border border-indigo-500/30 flex items-center justify-center text-amber-400 font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">{task.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-amber-300">{task.reward}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-500/20">
                    {task.category}
                  </span>
                </div>
              </div>
            </div>

            <div>
              {task.completed ? (
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" /> Claimed
                </div>
              ) : (
                <button
                  onClick={() => handleClaim(task.id)}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-4 py-2 rounded-xl text-xs shadow-md transition"
                >
                  Claim
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}