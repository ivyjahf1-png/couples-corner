"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, Coins, Volume2, VolumeX } from "lucide-react";

export type Shape = "Circle" | "Triangle" | "Cross" | "Square" | "Star" | "Whot!";

export interface Card {
  id: string;
  shape: Shape;
  number: number;
}

export interface Player {
  id: string;
  name: string;
  level: number;
  countryFlag: string;
  avatarUrl: string;
  hand: Card[];
  isUser?: boolean;
}

interface WhotEngineProps {
  initialStake?: number;
  onWin?: (amount: number) => void;
  onLose?: (amount: number) => void;
}

const SHAPES: Shape[] = ["Circle", "Triangle", "Cross", "Square", "Star"];

function createWhotDeck(): Card[] {
  const deck: Card[] = [];
  let idCount = 1;
  [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14].forEach((num) => {
    deck.push({ id: `c-${idCount++}`, shape: "Circle", number: num });
    deck.push({ id: `t-${idCount++}`, shape: "Triangle", number: num });
  });
  [1, 2, 3, 5, 7, 10, 11, 13, 14].forEach((num) => {
    deck.push({ id: `cr-${idCount++}`, shape: "Cross", number: num });
    deck.push({ id: `sq-${idCount++}`, shape: "Square", number: num });
  });
  [1, 2, 3, 4, 5, 7, 8].forEach((num) => {
    deck.push({ id: `st-${idCount++}`, shape: "Star", number: num });
  });
  for (let i = 0; i < 5; i++) {
    deck.push({ id: `w20-${idCount++}`, shape: "Whot!", number: 20 });
  }
  return deck.sort(() => Math.random() - 0.5);
}

export default function WhotEngine({
  initialStake = 50000,
  onWin,
  onLose,
}: WhotEngineProps) {
  const [deck, setDeck] = useState<Card[]>(() => createWhotDeck());
  const [discardPile, setDiscardPile] = useState<Card[]>(() => [
    { id: "init-1", shape: "Circle", number: 5 },
  ]);

  const [requestedShape, setRequestedShape] = useState<Shape | null>(null);
  const [showIneedModal, setShowIneedModal] = useState<boolean>(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [gameWinner, setGameWinner] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [players, setPlayers] = useState<Player[]>([
    {
      id: "p1",
      name: "IFEANYI",
      level: 14,
      countryFlag: "🇳🇬",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      hand: [],
      isUser: true,
    },
    {
      id: "p2",
      name: "KINGSLEY",
      level: 12,
      countryFlag: "🇳🇬",
      avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100",
      hand: [],
    },
    {
      id: "p3",
      name: "ADAEZE",
      level: 9,
      countryFlag: "🇳🇬",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
      hand: [],
    },
    {
      id: "p4",
      name: "OLUMIDE",
      level: 7,
      countryFlag: "🇳🇬",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      hand: [],
    },
  ]);

  // Calm Voice / Audio Synthesizer helper using Web Speech API or Tone Generator
  const playCalmVoicePrompt = (text: string) => {
    if (!soundEnabled || typeof window === "undefined") return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Stop previous utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.8; // Lower pitch for a soothing/calm tone
      utterance.rate = 0.9;  // Gentle, relaxed speed
      utterance.volume = 0.6;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const currentDeck = [...deck];
    const updatedPlayers = players.map((player) => {
      const hand = currentDeck.splice(0, 6);
      return { ...player, hand };
    });
    setPlayers(updatedPlayers);
    setDeck(currentDeck);
    playCalmVoicePrompt("Welcome to Whot. Your turn, Ifeanyi.");
  }, []);

  const topCard = discardPile[discardPile.length - 1];
  const user = players[0];

  const isValidMove = (card: Card) => {
    if (card.number === 20) return true;
    if (requestedShape) return card.shape === requestedShape;
    return card.shape === topCard.shape || card.number === topCard.number;
  };

  const handleDrawCard = () => {
    if (turnIndex !== 0 || gameWinner || deck.length === 0) return;
    playCalmVoicePrompt("Market drawn.");
    const newDeck = [...deck];
    const drawnCard = newDeck.pop()!;
    const updatedPlayers = [...players];
    updatedPlayers[0].hand.push(drawnCard);
    setDeck(newDeck);
    setPlayers(updatedPlayers);
    advanceTurn();
  };

  const handlePlaySelectedCard = () => {
    if (!selectedCardId || turnIndex !== 0 || gameWinner) return;
    const card = user.hand.find((c) => c.id === selectedCardId);
    if (!card || !isValidMove(card)) return;

    if (card.number === 20) {
      playCalmVoicePrompt("Whot! Choose your shape.");
      setShowIneedModal(true);
      return;
    }
    executePlayCard(card, null);
  };

  const executePlayCard = (card: Card, chosenShape: Shape | null) => {
    const updatedPlayers = [...players];
    updatedPlayers[turnIndex].hand = updatedPlayers[turnIndex].hand.filter(
      (c) => c.id !== card.id
    );

    setDiscardPile((prev) => [...prev, card]);
    setRequestedShape(chosenShape);
    setSelectedCardId(null);
    setShowIneedModal(false);

    if (card.number === 2) playCalmVoicePrompt("Pick two.");
    if (card.number === 14) playCalmVoicePrompt("General market.");

    if (updatedPlayers[turnIndex].hand.length === 0) {
      setGameWinner(updatedPlayers[turnIndex].name);
      playCalmVoicePrompt(`${updatedPlayers[turnIndex].name} wins the match!`);
      if (turnIndex === 0 && onWin) onWin(initialStake * 0.9);
      return;
    }

    let currentDeck = [...deck];
    if (card.number === 2) {
      const nextIndex = (turnIndex + 1) % 4;
      updatedPlayers[nextIndex].hand.push(...currentDeck.splice(-2));
    } else if (card.number === 14) {
      updatedPlayers.forEach((p, idx) => {
        if (idx !== turnIndex && currentDeck.length > 0) {
          p.hand.push(currentDeck.pop()!);
        }
      });
    }

    setDeck(currentDeck);
    setPlayers(updatedPlayers);
    advanceTurn();
  };

  const advanceTurn = () => {
    const next = (turnIndex + 1) % 4;
    setTurnIndex(next);
    if (next !== 0) {
      playCalmVoicePrompt(`${players[next].name}'s turn.`);
      // Simulate bot play after 1.5s
      setTimeout(() => simulateBotTurn(next), 1500);
    }
  };

  const simulateBotTurn = (botIdx: number) => {
    if (gameWinner) return;
    const bot = players[botIdx];
    const playableCard = bot.hand.find((c) => isValidMove(c));
    
    if (playableCard) {
      const updatedPlayers = [...players];
      updatedPlayers[botIdx].hand = updatedPlayers[botIdx].hand.filter((c) => c.id !== playableCard.id);
      setDiscardPile((prev) => [...prev, playableCard]);
      setRequestedShape(null);
      setPlayers(updatedPlayers);
      if (updatedPlayers[botIdx].hand.length === 0) {
        setGameWinner(bot.name);
        playCalmVoicePrompt(`${bot.name} wins!`);
        return;
      }
    } else if (deck.length > 0) {
      const newDeck = [...deck];
      bot.hand.push(newDeck.pop()!);
      setDeck(newDeck);
    }
    setTurnIndex(0);
    playCalmVoicePrompt("Your turn, Ifeanyi.");
  };

  const handleSelectShape = (shape: Shape) => {
    const card = user.hand.find((c) => c.id === selectedCardId);
    if (card) {
      playCalmVoicePrompt(`I need ${shape}`);
      executePlayCard(card, shape);
    }
  };

  return (
    <div className="flex h-screen w-full max-w-md mx-auto flex-col justify-between overflow-hidden bg-[#070D1B] p-2 text-white select-none">
      
      {/* TOP HEADER WITH AUDIO TOGGLE */}
      <div className="flex items-center justify-between px-3 pt-2">
        <div className={`relative flex items-center gap-2 rounded-2xl border-2 p-1 ${
          turnIndex === 1 ? "border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "border-emerald-500/40 bg-black/40"
        }`}>
          <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-emerald-400">
            <img src={players[1].avatarUrl} alt="Kingsley" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-[11px] font-black">{players[1].name}</div>
            <div className="text-[8px] text-emerald-300">Lv.{players[1].level} 🇳🇬</div>
          </div>
        </div>

        {/* Audio Mute/Unmute */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 border border-slate-600 text-slate-200"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-red-400" />}
        </button>

        <div className={`relative flex items-center gap-2 rounded-2xl border-2 p-1 ${
          turnIndex === 2 ? "border-pink-400 bg-pink-950/40 shadow-[0_0_15px_rgba(244,114,182,0.5)]" : "border-pink-500/40 bg-black/40"
        }`}>
          <div className="text-right">
            <div className="text-[11px] font-black">{players[2].name}</div>
            <div className="text-[8px] text-pink-300">Lv.{players[2].level} 🇳🇬</div>
          </div>
          <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-pink-400">
            <img src={players[2].avatarUrl} alt="Adaeze" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      {/* CENTER TABLE CONTAINER */}
      <div className="relative my-auto aspect-[4/5] w-full rounded-3xl border border-blue-500/30 bg-[#0E162B] p-3 shadow-[0_0_40px_rgba(15,23,42,0.9)] flex flex-col justify-between">
        
        {/* Top Opponent Hand */}
        <div className="flex justify-center -space-x-4">
          {players[2].hand.map((_, i) => (
            <div key={i} className="h-10 w-7 rounded-md border border-indigo-400/40 bg-indigo-950 shadow-md" />
          ))}
        </div>

        {/* Discard & Draw Deck */}
        <div className="flex items-center justify-between px-2">
          <div className="relative flex flex-col items-center">
            <div className="relative h-24 w-16 rounded-xl border-2 border-purple-400 bg-purple-950/90 p-2 shadow-[0_0_15px_rgba(168,85,247,0.6)] flex flex-col justify-between">
              <span className="text-xs font-black">{topCard.shape[0]}</span>
              <span className="text-center text-2xl font-black text-purple-200">
                {topCard.number === 20 ? "C" : topCard.shape[0]}
              </span>
              <span className="text-[9px] text-right font-bold">{topCard.number}</span>
            </div>
            {requestedShape && (
              <span className="mt-1 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-extrabold text-black animate-pulse">
                Need: {requestedShape}
              </span>
            )}
          </div>

          <button
            onClick={handleDrawCard}
            className="group relative h-24 w-16 rounded-xl border-2 border-cyan-400 bg-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center justify-center transition active:scale-95"
          >
            <div className="h-20 w-12 rounded-lg border border-cyan-500/40 bg-gradient-to-br from-cyan-950 to-indigo-950 flex flex-col items-center justify-center">
              <span className="text-sm text-cyan-300 font-black">WHOT!</span>
              <span className="text-[8px] text-cyan-200">{deck.length}</span>
            </div>
          </button>

          {/* Staking Pool Box */}
          <div className="flex flex-col items-end gap-1 rounded-xl border border-indigo-400/30 bg-black/60 px-2 py-1.5 shadow-md">
            <span className="text-[9px] text-slate-300 font-bold">TOTAL STAKE</span>
            <span className="text-[11px] font-black text-slate-100">₦{initialStake.toLocaleString()}</span>
            <span className="text-[9px] text-amber-400 font-bold mt-1">WINNER POOL</span>
            <span className="text-[11px] font-black text-amber-300">₦{(initialStake * 0.9).toLocaleString()}</span>
          </div>
        </div>

        {/* User Hand (Ifeanyi) */}
        <div className="flex justify-center -space-x-3 overflow-x-auto py-1">
          {user.hand.map((card) => {
            const isSelected = selectedCardId === card.id;
            const valid = isValidMove(card);
            return (
              <button
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={`relative h-18 w-12 rounded-lg border-2 p-1 transition-all ${
                  isSelected
                    ? "-translate-y-3 border-amber-400 bg-amber-950/90 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
                    : valid
                    ? "border-cyan-400/70 bg-slate-900"
                    : "border-slate-700 bg-slate-950 opacity-60"
                }`}
              >
                <div className="flex justify-between text-[8px] font-black">
                  <span>{card.shape[0]}</span>
                  <span>{card.number}</span>
                </div>
                <div className="my-1 text-center text-base font-black text-cyan-200">
                  {card.number === 20 ? "★" : card.shape[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTTOM PLAYERS & CONTROLS */}
      <div className="flex items-end justify-between px-3 pb-1">
        <div className={`relative flex items-center gap-2 rounded-2xl border-2 p-1 ${
          turnIndex === 0 ? "border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "border-emerald-500/40 bg-black/40"
        }`}>
          <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-emerald-400">
            <img src={user.avatarUrl} alt="Ifeanyi" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-[11px] font-black text-emerald-300">IFEANYI <span className="text-[8px]">(YOU)</span></div>
            <div className="text-[8px] text-emerald-300">Lv.{user.level} 🇳🇬</div>
          </div>
        </div>

        <button
          onClick={handlePlaySelectedCard}
          disabled={!selectedCardId || turnIndex !== 0}
          className={`h-10 px-5 rounded-2xl font-black text-xs tracking-wider border-2 shadow-lg transition active:scale-95 ${
            selectedCardId && turnIndex === 0
              ? "border-cyan-300 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse"
              : "border-slate-700 bg-slate-900 text-slate-500"
          }`}
        >
          PLAY CARD
        </button>

        <div className={`relative flex items-center gap-2 rounded-2xl border-2 p-1 ${
          turnIndex === 3 ? "border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(251,191,36,0.5)]" : "border-amber-500/40 bg-black/40"
        }`}>
          <div className="text-right">
            <div className="text-[11px] font-black">{players[3].name}</div>
            <div className="text-[8px] text-amber-300">Lv.{players[3].level} 🇳🇬</div>
          </div>
          <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-amber-400">
            <img src={players[3].avatarUrl} alt="Olumide" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      {/* WHOT SHAPE MODAL */}
      {showIneedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-xs rounded-3xl border-2 border-purple-400 bg-slate-900 p-4 text-center shadow-[0_0_30px_rgba(168,85,247,0.7)]">
            <h3 className="text-sm font-black text-purple-300 mb-1">WHOT! 20 PLAYED</h3>
            <p className="text-xs text-slate-300 mb-3">Select the shape you need:</p>
            <div className="grid grid-cols-2 gap-2">
              {SHAPES.map((shape) => (
                <button
                  key={shape}
                  onClick={() => handleSelectShape(shape)}
                  className="rounded-xl border border-purple-500/40 bg-purple-950/60 p-2 text-xs font-bold text-purple-200 hover:bg-purple-800 transition active:scale-95"
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WINNER OVERLAY */}
      {gameWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="text-center">
            <h2 className="text-2xl font-black text-amber-300 mb-2">🎉 {gameWinner} WINS! 🎉</h2>
            <button
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-amber-500 px-5 py-2 text-xs font-black text-black shadow-lg"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}