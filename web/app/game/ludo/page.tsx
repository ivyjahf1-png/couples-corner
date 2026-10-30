"use client";

import React, { useState, useRef } from "react";

interface Player {
  id: number;
  color: "red" | "yellow" | "green" | "blue";
  name: string;
  tokens: number[]; // -1 = Yard, 0..51 = Main Track, >=52 = Finished
}

export default function LudoSuperstarPage() {
  const [currentScreen, setCurrentScreen] = useState<"dashboard" | "game" | "victory">("dashboard");
  const [wager, setWager] = useState<number>(10000000);
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [subMode, setSubMode] = useState<string>("CLASSIC");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [diceRolling, setDiceRolling] = useState<boolean>(false);

  // Game Engine State
  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number>(0);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, color: "red", name: "Player 1", tokens: [-1, -1, -1, -1] },
    { id: 1, color: "yellow", name: "Player 2", tokens: [-1, -1, -1, -1] },
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Main board outer track coordinate mapping [row, col]
  const mainPathGrid = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8],
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14],
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6],
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0], [6, 0]
  ];

  // Web Audio Sound Synthesizer
  const playAudio = (type: "click" | "roll" | "move" | "victory") => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === "roll") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "move") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "victory") {
        osc.type = "square";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch {
      // Audio fallback
    }
  };

  const startGame = () => {
    playAudio("click");
    setPlayers([
      { id: 0, color: "red", name: "Player 1", tokens: [-1, -1, -1, -1] },
      { id: 1, color: "yellow", name: "Player 2", tokens: [-1, -1, -1, -1] },
    ]);
    setCurrentPlayer(0);
    setDiceValue(0);
    setHasRolled(false);
    setCurrentScreen("game");
  };

  const passTurn = (extraTurn: boolean) => {
    setHasRolled(false);
    if (!extraTurn) {
      setCurrentPlayer((prev) => (prev + 1) % playerCount);
    }
  };

  const rollDice = () => {
    if (hasRolled || diceRolling) return;
    playAudio("roll");
    setDiceRolling(true);

    setTimeout(() => {
      const rolledVal = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolledVal);
      setHasRolled(true);
      setDiceRolling(false);

      const activePlayer = players[currentPlayer];
      const canMove = activePlayer.tokens.some(
        (pos) => (pos === -1 && rolledVal === 6) || pos >= 0
      );

      if (!canMove) {
        setTimeout(() => passTurn(false), 1000);
      }
    }, 400);
  };

  const handleTokenClick = (playerId: number, tokenIdx: number) => {
    if (!hasRolled || playerId !== currentPlayer) return;

    const updatedPlayers = [...players];
    const player = updatedPlayers[playerId];
    const currentPos = player.tokens[tokenIdx];

    if (currentPos === -1) {
      if (diceValue === 6) {
        player.tokens[tokenIdx] = 0;
        playAudio("move");
        setPlayers(updatedPlayers);
        passTurn(true);
      }
    } else {
      const nextPos = (currentPos + diceValue) % mainPathGrid.length;
      player.tokens[tokenIdx] = nextPos;
      playAudio("move");
      setPlayers(updatedPlayers);

      if (player.tokens.every((p) => p >= 52)) {
        playAudio("victory");
        setCurrentScreen("victory");
        return;
      }

      passTurn(diceValue === 6);
    }
  };

  return (
    <div className="w-full min-h-screen max-w-[480px] mx-auto bg-slate-950 text-white font-sans flex flex-col justify-between overflow-hidden relative shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-amber-500/30">
        <div className="text-xl font-bold text-amber-400 tracking-wider">
          LUDO SUPERSTAR
        </div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-lg bg-slate-800 text-amber-400 border border-amber-500/30"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* DASHBOARD SCREEN */}
      {currentScreen === "dashboard" && (
        <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
          <div className="bg-slate-900/80 border border-amber-500/40 p-6 rounded-2xl backdrop-blur-md space-y-4">
            <h2 className="text-2xl font-black text-amber-400 text-center">
              MATCH SETUP
            </h2>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Wager Entry</label>
              <div className="text-2xl font-extrabold text-amber-400">
                {wager.toLocaleString()} Coins
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Players</label>
              <select
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="w-full bg-slate-800 border border-amber-500/30 text-white px-4 py-3 rounded-xl font-bold"
              >
                <option value={2}>2 Players</option>
                <option value={4}>4 Players</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Mode</label>
              <select
                value={subMode}
                onChange={(e) => setSubMode(e.target.value)}
                className="w-full bg-slate-800 border border-amber-500/30 text-white px-4 py-3 rounded-xl font-bold"
              >
                <option value="CLASSIC">Classic Mode</option>
                <option value="AERO">Aero Quick Mode</option>
                <option value="TALLY">Tally Rush</option>
                <option value="SLAY">Slay Mode</option>
              </select>
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xl rounded-xl shadow-lg transition-transform active:scale-95 mt-4"
            >
              START MATCH
            </button>
          </div>
        </div>
      )}

      {/* GAMEPLAY SCREEN */}
      {currentScreen === "game" && (
        <div className="flex-1 p-4 flex flex-col justify-between items-center">
          {/* Top Status Bar */}
          <div className="w-full flex justify-between items-center bg-slate-900/80 p-3 rounded-xl border border-amber-500/30">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block animate-pulse"></span>
              <span className="font-bold text-sm">
                {currentPlayer === 0 ? "👉 Your Turn" : "Player 1 (Red)"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
              <span className="font-bold text-sm">
                {currentPlayer === 1 ? "👉 Opponent Turn" : "Player 2 (Yellow)"}
              </span>
            </div>
          </div>

          {/* 15x15 Ludo Board Grid */}
          <div className="w-full aspect-square grid grid-cols-15 gap-[1px] bg-slate-900 border-2 border-amber-500/40 p-1 rounded-xl shadow-2xl my-auto">
            {Array.from({ length: 225 }, (_, idx) => {
              const r = Math.floor(idx / 15);
              const c = idx % 15;
              const isStar =
                (r === 2 && c === 6) ||
                (r === 6 && c === 12) ||
                (r === 12 && c === 8) ||
                (r === 8 && c === 2);

              let cellColor = "bg-slate-950/80";
              if (r < 6 && c < 6) cellColor = "bg-emerald-600/30";
              else if (r < 6 && c > 8) cellColor = "bg-yellow-500/30";
              else if (r > 8 && c < 6) cellColor = "bg-red-600/30";
              else if (r > 8 && c > 8) cellColor = "bg-blue-600/30";
              else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cellColor = "bg-amber-500/40";

              const tokensOnCell: { playerId: number; tokenIdx: number; color: string }[] = [];
              players.forEach((player) => {
                player.tokens.forEach((pos, tokenIdx) => {
                  if (pos === -1) {
                    if (
                      player.color === "red" &&
                      ((r === 10 && c === 1) || (r === 10 && c === 3) || (r === 12 && c === 1) || (r === 12 && c === 3)) &&
                      tokenIdx === (r === 10 ? (c === 1 ? 0 : 1) : (c === 1 ? 2 : 3))
                    ) {
                      tokensOnCell.push({ playerId: player.id, tokenIdx, color: "bg-red-500" });
                    }
                    if (
                      player.color === "yellow" &&
                      ((r === 1 && c === 10) || (r === 1 && c === 12) || (r === 3 && c === 10) || (r === 3 && c === 12)) &&
                      tokenIdx === (r === 1 ? (c === 10 ? 0 : 1) : (c === 10 ? 2 : 3))
                    ) {
                      tokensOnCell.push({ playerId: player.id, tokenIdx, color: "bg-yellow-400" });
                    }
                  } else if (pos >= 0 && pos < mainPathGrid.length) {
                    const gridPos = mainPathGrid[pos];
                    if (gridPos[0] === r && gridPos[1] === c) {
                      tokensOnCell.push({ playerId: player.id, tokenIdx, color: player.color === "red" ? "bg-red-500" : "bg-yellow-400" });
                    }
                  }
                });
              });

              return (
                <div
                  key={idx}
                  className={`w-full h-full border border-slate-800/40 flex items-center justify-center relative ${cellColor}`}
                >
                  {isStar && <span className="text-[10px]">⭐</span>}

                  {tokensOnCell.map((t) => (
                    <button
                      key={`${t.playerId}-${t.tokenIdx}`}
                      onClick={() => handleTokenClick(t.playerId, t.tokenIdx)}
                      className={`w-4 h-4 rounded-full border-2 border-white shadow-md font-bold text-[8px] flex items-center justify-center transition-transform hover:scale-125 z-10 ${t.color}`}
                    >
                      {t.tokenIdx + 1}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Bottom Action Area */}
          <div className="w-full flex flex-col items-center space-y-3 mb-2">
            <button
              onClick={rollDice}
              disabled={hasRolled || diceRolling}
              className={`px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-2xl rounded-2xl border-2 border-amber-300 shadow-xl transition-all ${
                diceRolling ? "animate-bounce" : ""
              } ${hasRolled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}
            >
              {diceRolling ? "🎲 ROLLING..." : diceValue === 0 ? "ROLL DICE" : `DICE: ${diceValue}`}
            </button>

            <button
              onClick={() => {
                if (confirm("Exit match and forfeit wager?")) {
                  setCurrentScreen("dashboard");
                }
              }}
              className="text-xs text-red-400 underline"
            >
              Forfeit Game
            </button>
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {currentScreen === "victory" && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-8 text-center max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-6xl animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-amber-400">YOU WIN!</h2>
            <p className="text-slate-300 font-bold">
              +{(wager * 2).toLocaleString()} Coins & +15 XP
            </p>

            <button
              onClick={() => setCurrentScreen("dashboard")}
              className="w-full py-3 bg-amber-500 text-slate-950 font-black rounded-xl hover:bg-amber-400 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}