'use client';

import React, { useState } from 'react';
import { Maximize2, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export const LudoGame: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);

  const toggleFullscreen = () => {
    const iframe = document.getElementById('ludo-iframe') as HTMLIFrameElement;
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 sm:p-4 max-w-4xl mx-auto">
      {/* Ludo Superstar Header Control Bar */}
      <div className="w-full bg-[#1E293B] border border-slate-700 rounded-t-2xl px-4 py-3 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider text-slate-950">
            Superstar
          </span>
          <h2 className="font-bold text-sm sm:text-base">Ludo Classic Board</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold transition flex items-center gap-1 text-xs"
          >
            <Maximize2 size={16} />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="w-full h-[650px] bg-[#0F172A] border-x border-b border-slate-800 rounded-b-2xl overflow-hidden shadow-2xl relative">
        <iframe
          id="ludo-iframe"
          src="/html5-games/ludo/index.html"
          title="Ludo Superstar Game"
          className="w-full h-full border-0"
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
};

export default LudoGame;