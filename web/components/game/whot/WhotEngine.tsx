"use client";
import { useState } from "react";

export type WhotCard = { id: number; value: number; suit: string };
export type WhotPlayer = { name: string; hand: WhotCard[]; isAI: boolean };

function buildPack(): WhotCard[] {
  const pack: WhotCard[] = [];
  for (let i = 0; i < 24; i++) {
    pack.push({ id: i, value: (i % 12) + 1, suit: i < 12 ? "HEARTS" : "SPADES" });
  }
  return pack.sort(() => Math.random() - 0.5);
}

export function WhotEngine({ onWin }: { onWin: (p: string) => void }) {
  const [hand, setHand] = useState<WhotCard[]>([]);
  const [opp, setOpp] = useState<WhotCard[]>([]);
  const [deck, setDeck] = useState<WhotCard[]>([]);
  const [discard, setDiscard] = useState<WhotCard | null>(null);
  const [suit, setSuit] = useState<number | null>(null);
  const [msg, setMsg] = useState("Welcome to Whot! Click Play.");
  const [playing, setPlaying] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  function start() {
    const pack = buildPack();
    const h: WhotCard[] = [];
    const o: WhotCard[] = [];
    for (let i = 0; i < 7; i++) { h.push(pack.pop()!); o.push(pack.pop()!); }
    const top = pack.pop()!;
    setHand(h); setOpp(o); setDeck(pack);
    setDiscard(top); setSuit(top.value);
    setMsg("Your turn! Match the number or draw.");
    setPlaying(true); setWinner(null);
  }

  function draw() {
    if (!deck.length) { setMsg("Deck empty."); return; }
    const d = [...deck]; const c = d.pop()!;
    setDeck(d); setHand((p) => [...p, c]);
    setMsg("Drew a card. Opponent turn.");
    setTimeout(() => {
      if (opp.length > 0) {
        const no = [...opp]; no.pop();
        setOpp(no); setMsg("Opponent played. Your turn.");
        if (no.length === 0) finish("OPPONENT");
      }
    }, 700);
  }

  function play(id: number) {
    const card = hand[id];
    if (!card || card.value !== suit) { setMsg("Must match the number."); return; }
    const nh = hand.filter((_, i) => i !== id);
    setHand(nh); setDiscard(card); setSuit(card.value);
    if (nh.length === 0) { finish("YOU"); return; }
    setMsg("Nice play! Opponent turn.");
    setTimeout(() => {
      if (opp.length > 1) {
        const no = [...opp]; no.pop();
        setOpp(no); setMsg("Opponent played. Your turn.");
        if (no.length === 0) finish("OPPONENT");
      } else {
        setOpp([]); finish("OPPONENT");
      }
    }, 700);
  }

  function finish(w: string) {
    setWinner(w); setPlaying(false);
    setMsg(w + " wins!");
    setTimeout(() => onWin(w), 500);
  }

  return (
    <div className="rounded-2xl bg-black/40 p-4 border border-white/10">
      <h3 className="text-xl font-black text-white mb-4">Whot! Card Game</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-black text-white mb-2">YOU ({hand.length})</h4>
          <div className="grid grid-cols-4 gap-1">
            {hand.map((c, i) => (
              <button key={c.id} onClick={() => play(i)} className="rounded-lg border border-amber-300/40 bg-amber-100 p-2 text-center hover:scale-105">
                <div className="text-xs font-black text-black">{c.value}</div>
                <div className="text-xs font-black text-black">{c.suit[0]}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-black text-white mb-2">OPPONENT ({opp.length})</h4>
          <div className="grid grid-cols-4 gap-1">
            {opp.map((c) => (
              <div key={c.id} className="rounded-lg bg-red-900/60 border border-white/20 p-2 text-center text-white text-xs">WHOT</div>
            ))}
          </div>
        </div>
      </div>
      {!playing && !winner ? (
        <button onClick={start} className="rounded-full bg-emerald-500 px-8 py-3 text-white font-black">Play</button>
      ) : (
        <>
          <div className="mb-3 rounded-lg border-2 border-white/30 p-3 text-center">
            {discard ? <span className="text-sm font-black text-white">{discard.value}{discard.suit}</span> : <span className="text-white/40">-</span>}
          </div>
          <p className="mb-3 text-xs text-white/80">Suit: {suit} - {msg}</p>
          <div className="flex gap-2">
            <button onClick={draw} className="rounded-full bg-blue-500 px-6 py-2 text-white font-black">Draw ({deck.length})</button>
            {winner && <p className="text-yellow-400 font-black">{winner} wins!</p>}
          </div>
        </>
      )}
      {winner && (
        <button onClick={start} className="mt-3 rounded-full bg-emerald-500 px-6 py-2 text-white font-black">Play Again</button>
      )}
    </div>
  );
}
