"use client";

import React, { useState, useRef } from "react";

interface Player {
  id: number;
  color: "red" | "green" | "yellow" | "blue";
  name: string;
  avatar: string;
  countryFlag: string;
  tokens: number[];
}

interface LudoProps {
  balance?: number;
  onWin?: (n: number) => void;
  onLose?: (n: number) => void;
}

export default function LudoSuperstar({ balance = 10000, onWin, onLose }: LudoProps) {
  const [currentScreen, setCurrentScreen] = useState<"dashboard" | "game" | "victory">("dashboard");
  const [wager, setWager] = useState<number>(balance);
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [diceRolling, setDiceRolling] = useState<boolean>(false);

  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number>(0);
  const [hasRolled, setHasRolled] = useState<boolean>(false);

  const [players, setPlayers] = useState<Player[]>([
    { id: 0, color: "red", name: "busybrain...", avatar: "👑", countryFlag: "🇳🇬", tokens: [-1, -1, -1, -1] },
    { id: 1, color: "green", name: "AI Green", avatar: "🤖", countryFlag: "🇬🇧", tokens: [-1, -1, -1, -1] },
    { id: 2, color: "yellow", name: "Itzel", avatar: "⭐", countryFlag: "🇲🇽", tokens: [-1, -1, -1, -1] },
    { id: 3, color: "blue", name: "AI Blue", avatar: "⚡", countryFlag: "🇺🇸", tokens: [-1, -1, -1, -1] },
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);

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

  const playAudio = (type: "roll" | "move") => {
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

      if (type === "roll") {
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
      }
    } catch {
      // audio fallback
    }
  };

  const startGame = () => {
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
    }, 500);
  };

  const handleTokenClick = (playerId: number, tokenIdx: number) => {
    if (!hasRolled || playerId !== currentPlayer) return;

    const updatedPlayers = [...players];
    const player = updatedPlayers[playerId];
    const currentPos = player.tokens[tokenIdx];

    const startPositions: Record<string, number> = {
      red: 38,
      green: 0,
      yellow: 12,
      blue: 25,
    };

    if (currentPos === -1) {
      if (diceValue === 6) {
        player.tokens[tokenIdx] = startPositions[player.color];
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
        setCurrentScreen("victory");
        if (onWin) onWin(wager * 2);
        return;
      }

      passTurn(diceValue === 6);
    }
  };

  const renderPlayerCard = (playerIndex: number, alignment: "top-right" | "top-left" | "bottom-left" | "bottom-right") => {
    const player = players[playerIndex];
    const isActive = currentPlayer === playerIndex;

    const borderColors = {
      red: "border-red-500",
      green: "border-emerald-400",
      yellow: "border-yellow-400",
      blue: "border-blue-500",
    };

    return (
      <div
        className={`flex items-center space-x-3 my-2 ${
          alignment.includes("right") ? "justify-end" : "justify-start"
        }`}
      >
        {isActive && (
          <button
            onClick={rollDice}
            disabled={hasRolled || diceRolling}
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-white shadow-[0_0_15px_rgba(251,191,36,0.8)] flex items-center justify-center text-slate-950 font-black text-xl transition-transform ${
              diceRolling ? "animate-spin" : "hover:scale-110 animate-bounce"
            } ${hasRolled ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Roll Dice"
          >
            {diceRolling ? "🎲" : diceValue === 0 ? "🎲" : diceValue}
          </button>
        )}

        <div
          className={`flex items-center space-x-2 bg-[#211142] border-2 ${borderColors[player.color]} rounded-2xl p-2 shadow-xl relative`}
        >
          <span className="absolute -top-2 left-2 bg-slate-900 text-white text-[9px] px-1.5 rounded border border-purple-500/40">
            {player.countryFlag}
          </span>
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-purple-950 border border-purple-500/30 flex items-center justify-center text-2xl">
              {player.avatar}
            </div>
            {isActive && (
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full animate-ping"></span>
            )}
          </div>
          <div>
            <div className="text-xs font-black text-white">{player.name}</div>
            <div className="text-[10px] text-amber-400 font-bold">🪙 2</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen max-w-[480px] mx-auto bg-[#130826] text-white font-sans flex flex-col justify-between overflow-hidden relative shadow-2xl">
      <div className="flex items-center justify-between p-3 bg-[#1c0e38] border-b border-purple-500/20">
        <div className="flex items-center space-x-2">
          <button className="p-1.5 rounded-lg bg-purple-900/50 text-purple-300">☰</button>
          <span className="bg-purple-900/60 px-3 py-1 rounded-full text-xs font-bold text-amber-400 border border-amber-500/30">
            Classic 4D
          </span>
        </div>
        <div className="flex items-center space-x-2 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-500/30">
          <span className="text-cyan-400 font-black text-sm">💎 0</span>
          <button className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center">＋</button>
        </div>
      </div>

      {currentScreen === "dashboard" && (
        <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
          <div className="bg-[#1c0e38] border-2 border-amber-500/40 p-6 rounded-3xl shadow-2xl space-y-4">
            <h2 className="text-3xl font-black text-amber-400 text-center tracking-wide">
              LUDO SUPERSTAR
            </h2>
            <div className="text-center text-purple-300 font-semibold">
              Wager: <span className="text-amber-400">{wager.toLocaleString()} Coins</span>
            </div>
            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-xl rounded-2xl shadow-lg hover:scale-105 transition-all"
            >
              START MATCH
            </button>
          </div>
        </div>
      )}

      {currentScreen === "game" && (
        <div className="flex-1 p-3 flex flex-col justify-between items-center">
          <div className="w-full px-1">
            {renderPlayerCard(2, "top-right")}
          </div>

          <div className="w-full aspect-square grid grid-cols-15 gap-[1px] bg-[#1a0c36] border-4 border-purple-600/60 p-1.5 rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.3)] relative my-auto">
            {Array.from({ length: 225 }, (_, idx) => {
              const r = Math.floor(idx / 15);
              const c = idx % 15;
              const isStar =
                (r === 2 && c === 6) ||
                (r === 6 && c === 12) ||
                (r === 12 && c === 8) ||
                (r === 8 && c === 2);

              let cellColor = "bg-[#130826]/90";
              if (r < 6 && c < 6) cellColor = "bg-emerald-600/40 border border-emerald-400/50 shadow-[inset_0_0_12px_rgba(16,185,129,0.4)]";
              else if (r < 6 && c > 8) cellColor = "bg-yellow-500/40 border border-yellow-400/50 shadow-[inset_0_0_12px_rgba(234,179,8,0.4)]";
              else if (r > 8 && c < 6) cellColor = "bg-red-600/40 border border-red-400/50 shadow-[inset_0_0_12px_rgba(239,68,68,0.4)]";
              else if (r > 8 && c > 8) cellColor = "bg-blue-600/40 border border-blue-400/50 shadow-[inset_0_0_12px_rgba(59,130,246,0.4)]";
              else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cellColor = "bg-purple-950/80";

              const tokensOnCell: { playerId: number; tokenIdx: number; color: string }[] = [];
              players.forEach((player) => {
                player.tokens.forEach((pos, tokenIdx) => {
                  if (pos === -1) {
                    if (player.color === "green" && ((r === 1 && c === 1) || (r === 1 && c === 3) || (r === 3 && c === 1) || (r === 3 && c === 3))) {
                      tokensOnCell.push({ playerId: player.id, tokenIdx, color: "bg-emerald-400" });
                    }
                    if (player.color === "yellow" && ((r === 1 && c === 10) || (r === 1 && c === 12) || (r === 3 && c === 10) || (r === 3 && c === 12))) {
                      tokensOnCell.push({ playerId: player.id, tokenIdx, color: "bg-yellow-400" });
                    }
                    if (player.color === "red" && ((r === 10 && c === 1) || (r === 10 && c === 3) || (r === 12 && c === 1) || (r === 12 && c === 3))) {
                      tokensOnCell.push({ playerId: player.id, tokenIdx, color: "bg-red-500" });
                    }
                    if (player.color === "blue" && ((r === 10 && c === 10) || (r === 10 && c === 12) || (r === 12 && c === 10) || (r === 12 && c === 12))) {
                      tokensOnCell.push({ playerId: player.id, tokenIdx, color: "bg-blue-500" });
                    }
                  } else if (pos >= 0 && pos < mainPathGrid.length) {
                    const gridPos = mainPathGrid[pos];
                    if (gridPos[0] === r && gridPos[1] === c) {
                      const bgMap = { red: "bg-red-500", green: "bg-emerald-400", yellow: "bg-yellow-400", blue: "bg-blue-500" };
                      tokensOnCell.push({ playerId: player.id, tokenIdx, color: bgMap[player.color] });
                    }
                  }
                });
              });

              return (
                <div key={idx} className={`w-full h-full flex items-center justify-center relative ${cellColor}`}>
                  {isStar && <span className="text-[8px]">⭐</span>}

                  {tokensOnCell.map((t) => (
                    <button
                      key={`${t.playerId}-${t.tokenIdx}`}
                      onClick={() => handleTokenClick(t.playerId, t.tokenIdx)}
                      className={`w-4 h-4 rounded-full border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.8)] font-black text-[7px] flex items-center justify-center z-20 ${t.color} text-slate-950`}
                    >
                      {t.tokenIdx + 1}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="w-full px-1 flex justify-between items-center">
            {renderPlayerCard(0, "bottom-left")}

            <div className="flex space-x-2">
              <button className="px-3 py-2 bg-[#211142] border border-purple-500/50 rounded-xl text-xs font-bold text-purple-200">EMOJI</button>
              <button className="px-3 py-2 bg-[#211142] border border-purple-500/50 rounded-xl text-xs font-bold text-purple-200">CHAT</button>
              <button className="px-3 py-2 bg-[#211142] border border-purple-500/50 rounded-xl text-xs font-bold text-purple-200">CALL</button>
            </div>
          </div>
        </div>
      )}

      {currentScreen === "victory" && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-[#1c0e38] border-2 border-amber-400 rounded-3xl p-8 text-center max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-6xl animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-amber-400">VICTORY!</h2>
            <p className="text-purple-200 font-bold">
              +{(wager * 2).toLocaleString()} Coins Won
            </p>
            <button
              onClick={() => setCurrentScreen("dashboard")}
              className="w-full py-3 bg-amber-400 text-slate-950 font-black rounded-xl hover:bg-amber-300 transition-colors shadow-lg"
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}