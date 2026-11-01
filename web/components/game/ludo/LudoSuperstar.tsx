import React, { useCallback, useEffect, useMemo, useState } from "react";

/**
 * LudoPrime — single-file responsive game UI.
 *
 * Industry-standard Ludo rules enforced by the backend (authoritative):
 * - Only a roll of 6 can bring a seed out of the home base onto the Home Gate tile.
 * - After exiting on a 6 the player may roll again. Another 6 allows bringing out
 *   a second seed OR continuing with an already-active seed (player choice via legalMoves).
 * - Movement always starts counting from the Home Gate tile (never from inside home).
 * - Seeds move exactly the rolled number of steps along the classic 52-step path.
 * - No jumping. Path is strictly sequential.
 *
 * Dice UI rule:
 * - The die is shown ONLY on the current player's profile card.
 * - When the turn ends the die automatically appears on the next player's card.
 */

type Player = {
  id: string;
  name: string;
  avatarUrl?: string;
  color: "green" | "yellow" | "red" | "blue";
  isYou?: boolean;
  isReady?: boolean;
  rank?: number;
  score?: number;
  level?: number;
  country?: string;
  flag?: string;
};

type Match = {
  id: string;
  players: Player[];
  currentPlayerId: string;
  status: "waiting" | "active" | "finished";
  turnEndsAt?: string;
  diceValue?: number | null;
  legalMoves?: Array<{ playerId: string; tokenId: string; destination: number }>;
  winnerId?: string;
  prizePool?: number;
  stake?: number;
  mode?: "classic" | "aero";
};

type LudoBackend = {
  findMatch: (args: { mode: "classic" | "aero"; stake?: number }) => Promise<Match>;
  getMatch?: (matchId: string) => Promise<Match>;
  rollDice: (matchId: string) => Promise<{ value: number; match: Match }>;
  moveToken: (args: { matchId: string; tokenId: string; destination: number }) => Promise<Match>;
  createStake?: (args: { matchId: string; amount: number }) => Promise<{ balance?: number }>;
  leaveMatch?: (matchId: string) => Promise<void>;
  playAgain?: (matchId: string) => Promise<Match>;
  subscribe?: (matchId: string, onMatch: (match: Match) => void) => (() => void);
  getStats?: () => Promise<{ matches: number; wins: number; earnings: number; winRate: number }>;
};

type Props = {
  backend?: LudoBackend;
  currentUser?: { id: string; name: string; avatarUrl?: string };
  onBack?: () => void;
};

type Page = "home" | "mode" | "stake" | "match" | "results" | "leaderboard" | "stats" | "settings";

const COLORS = {
  green: "#16b957",
  yellow: "#f4bd35",
  red: "#ed5145",
  blue: "#3185ef",
};

const COMPUTER_NAMES = [
  "Amina", "Chidi", "Fatima", "Kwame", "Zainab", "Emeka", "Ngozi", "Omar",
  "Sade", "Tariq", "Laila", "Bayo", "Ife", "Hassan", "Amara", "Kofi",
  "Yara", "Seyi", "Nia", "Jabari", "Maya", "Ade", "Chioma", "Femi"
];

function pickRandomNames(count: number, exclude: string[] = []): string[] {
  const pool = COMPUTER_NAMES.filter(n => !exclude.includes(n));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
:root{color-scheme:dark;--bg:#080d1b;--panel:#111a2d;--muted:#8c9ab5;--line:#273550;--gold:#ffc75e}
*{box-sizing:border-box}
.lp-root{min-height:100dvh;width:100%;overflow-x:hidden;background:radial-gradient(ellipse at 50% -20%,#25366b 0%,#101a35 42%,#080d1b 78%);color:#f7f8ff;font-family:'DM Sans',sans-serif;padding:clamp(10px,2vw,26px)}
.lp-shell{max-width:1180px;margin:0 auto;min-height:calc(100dvh - 2 * clamp(10px,2vw,26px));display:flex;flex-direction:column}
.lp-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:clamp(14px,2.5vh,26px)}
.lp-brand{display:flex;align-items:center;gap:10px;font-family:'Space Grotesk';font-weight:700;letter-spacing:-1px;font-size:clamp(20px,3vw,29px)}
.lp-logo{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#ffda79,#f18a3c 55%,#8c50ff);box-shadow:0 7px 25px #f59b4a44;font-size:23px}
.lp-topright{display:flex;align-items:center;gap:8px}
.lp-pill{border:1px solid #334360;background:#111d34;border-radius:999px;padding:9px 13px;color:#dce5ff;font-size:12px;font-weight:700}
.lp-iconbtn,.lp-back{border:1px solid #334360;background:#111d34;color:#eaf0ff;border-radius:12px;width:42px;height:42px;display:grid;place-items:center;font-size:18px;cursor:pointer}
.lp-content{flex:1;display:flex;flex-direction:column;gap:18px}
.lp-hero{position:relative;overflow:hidden;border:1px solid #3a4d78;border-radius:26px;padding:clamp(20px,4vw,42px);background:linear-gradient(115deg,#18284a,#273b72 55%,#513d75);box-shadow:0 18px 50px #0005}
.lp-hero:after{content:'🎲';position:absolute;right:6%;top:12%;font-size:clamp(72px,14vw,150px);opacity:.16;transform:rotate(-18deg)}
.lp-eyebrow{color:#ffcf76;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase}
.lp-h1{font-family:'Space Grotesk';font-size:clamp(30px,5vw,55px);line-height:1.03;letter-spacing:-2px;margin:10px 0 12px;max-width:620px}
.lp-sub{color:#c1cce5;max-width:550px;line-height:1.55;font-size:14px}
.lp-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.lp-btn{border:0;border-radius:13px;padding:13px 18px;font:700 13px 'DM Sans';cursor:pointer;transition:transform .15s,filter .15s}
.lp-btn:hover{transform:translateY(-2px);filter:brightness(1.08)}
.lp-primary{background:linear-gradient(135deg,#ffda83,#f39a42);color:#24170a;box-shadow:0 7px 20px #f2a34833}
.lp-secondary{background:#243657;color:#edf3ff;border:1px solid #42577e}
.lp-danger{background:#582b3a;color:#ffdce3;border:1px solid #88475a}
.lp-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.lp-sectionhead{display:flex;justify-content:space-between;align-items:center;gap:12px}
.lp-sectionhead h2{font:700 18px 'Space Grotesk';margin:0}
.lp-muted{color:var(--muted);font-size:12px}
.lp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.lp-tile{background:linear-gradient(145deg,#17233b,#10192b);border:1px solid #2b3a57;border-radius:18px;padding:17px;text-align:left;color:#f6f7ff;cursor:pointer;min-height:115px}
.lp-tile .emoji{font-size:25px}.lp-tile strong{display:block;margin:9px 0 4px;font-size:14px}.lp-tile span{font-size:11px;color:#98a8c6;line-height:1.4}
.lp-panel{background:linear-gradient(145deg,#141f35,#0f1729);border:1px solid #2b3a57;border-radius:20px;padding:clamp(14px,2.5vw,22px)}
.lp-backrow{display:flex;align-items:center;gap:12px;margin-bottom:2px}
.lp-backrow h1{font:700 clamp(22px,3vw,30px) 'Space Grotesk';margin:0}
.lp-modes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.lp-mode{border-radius:20px;border:1px solid #354769;padding:20px;background:linear-gradient(145deg,#1a2a49,#111b30);color:white;text-align:left;cursor:pointer;min-height:190px}
.lp-mode.aero{background:linear-gradient(145deg,#233b65,#19233e);border-color:#4a71a7}
.lp-mode .modeicon{font-size:38px}.lp-mode h3{font:700 21px 'Space Grotesk';margin:14px 0 6px}.lp-mode p{font-size:12px;color:#aab8d1;line-height:1.5;margin:0}
.lp-stakes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.lp-stake{padding:15px 8px;border:1px solid #354769;border-radius:14px;background:#111d32;color:#fff;font-weight:800;cursor:pointer}
.lp-stake.selected{border-color:#ffc75e;background:#473820;box-shadow:inset 0 0 0 1px #ffc75e}
.lp-note{font-size:12px;color:#9aabc8;line-height:1.5}
.lp-gamehead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}
.lp-players-top,.lp-players-bottom{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%}
.lp-player-card{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:16px;background:linear-gradient(145deg,#141f35,#0f1729);border:2px solid #2d3c59;min-width:0;position:relative;box-shadow:0 4px 14px #0005;transition:box-shadow .2s,border-color .2s}
.lp-player-card.active{box-shadow:0 0 0 2px var(--glow),0 0 18px var(--glow)}
.lp-player-card.green{--glow:#16b95788;border-color:#16b957}
.lp-player-card.yellow{--glow:#f4bd3588;border-color:#f4bd35}
.lp-player-card.red{--glow:#ed514588;border-color:#ed5145}
.lp-player-card.blue{--glow:#3185ef88;border-color:#3185ef}
.lp-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#273958;overflow:hidden;flex-shrink:0;font-weight:800;border:2px solid #ffffff33}
.lp-avatar img{width:100%;height:100%;object-fit:cover}
.lp-player-info{min-width:0;flex:1}
.lp-playername{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px}
.lp-playername .you-badge{font-size:10px;background:#ffc75e;color:#24170a;padding:1px 6px;border-radius:6px;font-weight:800}
.lp-player-meta{font-size:11px;color:#9aabc8;margin-top:2px;display:flex;align-items:center;gap:6px}
.lp-dice-slot{width:36px;height:36px;border-radius:10px;background:linear-gradient(145deg,#fff,#d9e2f2);color:#18243c;display:grid;place-items:center;font-size:20px;font-weight:900;box-shadow:0 3px 0 #8c9db8;flex-shrink:0;animation:dicePop .25s ease}
@keyframes dicePop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
.lp-meet{display:flex;flex-direction:column;align-items:center;gap:2px;color:#c1cce5;font-size:11px;font-weight:700}
.lp-meet .icon{font-size:22px;background:#1a2a49;border-radius:50%;width:40px;height:40px;display:grid;place-items:center;border:1px solid #354769}
.lp-boardwrap{width:min(100%,min(68vh,660px));margin:12px auto;aspect-ratio:1;position:relative}
.lp-board{width:100%;height:100%;display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);border:6px solid #c4a574;border-radius:18px;overflow:hidden;background:#f4f1df;box-shadow:0 20px 45px #0008, inset 0 0 0 3px #e8d9b5}
.lp-cell{position:relative;border:1px solid #c9c8bd;background:#f9f7e9;display:grid;place-items:center;min-width:0;min-height:0;font-size:clamp(8px,1.4vw,14px)}
.lp-home{grid-column:span 6;grid-row:span 6;margin:4%;border-radius:16%;display:grid;place-items:center;box-shadow:inset 0 0 0 4px #ffffff55,0 4px 12px #0003}
.lp-homeinner{width:70%;height:70%;border-radius:18%;background:#fffdf1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;place-items:center;padding:10%;gap:10%;box-shadow:inset 0 2px 6px #0001}
.lp-homehole{width:78%;height:78%;border-radius:50%;background:var(--pawn);box-shadow:inset 0 4px 5px #0002,0 2px 3px #0002;position:relative}
.lp-center{grid-column:7 / span 3;grid-row:7 / span 3;position:relative;background:#f4f1df;display:grid;place-items:center}
.lp-center-inner{width:86%;height:86%;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4px;transform:rotate(45deg)}
.lp-center-quad{border-radius:8px;display:grid;place-items:center}
.lp-path{background:#fffdf3}
.lp-path.safe{background:#f7e6aa}
.lp-path .lp-token{position:absolute;width:78%;height:78%;z-index:2}
.lp-token{border-radius:40% 40% 48% 48%;background:linear-gradient(145deg,#ffffffaa,var(--pawn) 28%,var(--pawn-dark) 100%);border:2px solid #ffffffa8;box-shadow:inset -4px -7px 6px #0003,inset 3px 3px 5px #ffffff88,0 4px 5px #0005;transform:perspective(80px) rotateX(8deg);display:grid;place-items:center;color:#fff;font-size:clamp(6px,1vw,11px);font-weight:900}
.lp-token:before{content:'';position:absolute;top:-18%;left:18%;width:64%;height:36%;border-radius:50%;background:linear-gradient(145deg,#fff9,var(--pawn));border:1px solid #ffffffaa;box-shadow:0 2px 3px #0003}
.lp-token.green{--pawn:#35e77d;--pawn-dark:#087d39}
.lp-token.yellow{--pawn:#ffe078;--pawn-dark:#ad7100}
.lp-token.red{--pawn:#ff8076;--pawn-dark:#a71e27}
.lp-token.blue{--pawn:#75b8ff;--pawn-dark:#104ca7}
.lp-token.selected{outline:3px solid #fff;outline-offset:2px;filter:brightness(1.2);z-index:5}
.lp-arrow{font-weight:900;line-height:1;opacity:0.9;pointer-events:none}
.lp-arrow.green{color:#16b957}
.lp-arrow.yellow{color:#f4bd35}
.lp-arrow.red{color:#ed5145}
.lp-arrow.blue{color:#3185ef}
.lp-star{color:#e6b422;font-size:clamp(10px,1.6vw,16px);text-shadow:0 1px 2px #0004;pointer-events:none}
.lp-gamebottom{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px}
.lp-dice{width:58px;height:58px;border-radius:14px;background:linear-gradient(145deg,#fff,#d9e2f2);color:#18243c;display:grid;place-items:center;font-size:32px;font-weight:900;box-shadow:0 7px 0 #8c9db8,0 10px 18px #0005}
.lp-turn{font-size:13px;color:#c7d3e9;text-align:center;display:flex;align-items:center;gap:8px}
.lp-turn .dot{width:8px;height:8px;border-radius:50%;background:#16b957;box-shadow:0 0 8px #16b957}
.lp-empty{padding:22px;border:1px dashed #3c4d6b;border-radius:15px;text-align:center;color:#aab8d1;font-size:13px;line-height:1.6}
.lp-statgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.lp-stat{padding:15px;border:1px solid #2d3e5c;border-radius:15px;background:#111d32}.lp-stat strong{display:block;font:700 23px 'Space Grotesk';margin-top:6px}.lp-stat span{font-size:10px;color:#9aabc8}
.lp-rankrow{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;padding:12px 2px;border-bottom:1px solid #293750}
.lp-ranknum{font-weight:800;color:#ffce72}
.lp-footer{display:flex;justify-content:center;gap:14px;padding:17px 0 2px;color:#71819e;font-size:10px}
.lp-error{padding:10px 13px;border-radius:12px;background:#542b38;border:1px solid #8d4a5c;color:#ffdce3;font-size:12px}
.lp-loading{opacity:.7;pointer-events:none}
@media(max-width:700px){
 .lp-root{padding:10px}.lp-shell{min-height:calc(100dvh - 20px)}.lp-top{margin-bottom:12px}
 .lp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lp-tile{min-height:100px;padding:13px}
 .lp-boardwrap{width:min(100%,calc(100vw - 28px),54dvh)}
 .lp-statgrid{grid-template-columns:repeat(2,1fr)}
 .lp-player-card{padding:8px 10px}
 .lp-avatar{width:36px;height:36px}
}
@media(max-width:420px){
 .lp-brand{font-size:18px}.lp-logo{width:34px;height:34px}.lp-pill{padding:8px 10px}
 .lp-hero{padding:20px}.lp-h1{font-size:34px}.lp-modes{grid-template-columns:1fr}
 .lp-mode{min-height:145px;padding:16px}.lp-stakes{grid-template-columns:repeat(2,1fr)}
 .lp-board{border-width:4px;border-radius:12px}
}
@media(max-height:740px) and (min-width:701px){
 .lp-content{gap:12px}.lp-boardwrap{width:min(100%,48vh,570px)}
 .lp-panel{padding:14px}
}
`;

const face: Record<number, string> = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };
const cellKey = (r: number, c: number) => `${r}-${c}`;

/**
 * Classic 52-step path (industry standard, clockwise).
 * Index 0  = Green  Home Gate
 * Index 13 = Yellow Home Gate
 * Index 26 = Blue   Home Gate
 * Index 39 = Red    Home Gate
 *
 * A seed ALWAYS starts counting from its own Home Gate tile.
 * Only a roll of 6 can place a seed onto its Home Gate.
 */
const PATH: Array<[number, number]> = [
  // Green Home Gate → ...
  [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  // Yellow Home Gate
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
  // Blue Home Gate
  [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
  // Red Home Gate
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
];

const HOME_GATES = [0, 13, 26, 39]; // green, yellow, blue, red
// Safe houses = every Home Gate + the 9th tile counting from each gate
const SAFE_INDICES = new Set([
  ...HOME_GATES,
  ...HOME_GATES.map(g => (g + 8) % 52)
]);

function Board({
  match,
  currentUserId,
  selectedToken,
  onSelect,
}: {
  match: Match;
  currentUserId?: string;
  selectedToken?: string | null;
  onSelect: (tokenId: string, destination: number) => void;
}) {
  const cells = useMemo(() => {
    const map = new Map<string, {
      type: string;
      color?: Player["color"];
      safe?: boolean;
      step?: number;
      arrow?: string;
      arrowColor?: Player["color"];
    }>();

    PATH.forEach(([r, c], i) => {
      map.set(cellKey(r, c), {
        type: "path",
        safe: SAFE_INDICES.has(i),
        step: i,
      });
    });

    // Directional arrows (visual only)
    [[5,6],[4,6],[3,6],[2,6],[1,6]].forEach(([r,c]) => {
      const k = cellKey(r,c);
      const prev = map.get(k);
      if (prev) map.set(k, { ...prev, arrow: "↑", arrowColor: "green" });
    });
    [[6,9],[6,10],[6,11],[6,12],[6,13]].forEach(([r,c]) => {
      const k = cellKey(r,c);
      const prev = map.get(k);
      if (prev) map.set(k, { ...prev, arrow: "→", arrowColor: "yellow" });
    });
    [[9,8],[10,8],[11,8],[12,8],[13,8]].forEach(([r,c]) => {
      const k = cellKey(r,c);
      const prev = map.get(k);
      if (prev) map.set(k, { ...prev, arrow: "↓", arrowColor: "blue" });
    });
    [[8,5],[8,4],[8,3],[8,2],[8,1]].forEach(([r,c]) => {
      const k = cellKey(r,c);
      const prev = map.get(k);
      if (prev) map.set(k, { ...prev, arrow: "←", arrowColor: "red" });
    });

    // Homes
    const homes: Array<{ r: number; c: number; color: Player["color"] }> = [
      { r: 0, c: 0, color: "green" },
      { r: 0, c: 9, color: "yellow" },
      { r: 9, c: 0, color: "red" },
      { r: 9, c: 9, color: "blue" },
    ];
    homes.forEach(h => map.set(cellKey(h.r, h.c), { type: "home", color: h.color }));

    // Colored home stretches (final approach into center)
    const lanes: Record<Player["color"], Array<[number, number]>> = {
      green:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
      yellow: [[1,7],[2,7],[3,7],[4,7],[5,7]],
      blue:   [[7,13],[7,12],[7,11],[7,10],[7,9]],
      red:    [[13,7],[12,7],[11,7],[10,7],[9,7]],
    };
    Object.entries(lanes).forEach(([color, coords]) => {
      const arrow = color === "green" ? "→" : color === "yellow" ? "↓" : color === "blue" ? "←" : "↑";
      coords.forEach(([r, c]) => {
        map.set(cellKey(r, c), {
          type: "lane",
          color: color as Player["color"],
          arrow,
          arrowColor: color as Player["color"],
        });
      });
    });

    return map;
  }, []);

  // Tokens that the backend has marked as legal to move right now
  const tokensOnBoard = (match.players || []).flatMap(p => {
    const legal = match.legalMoves?.filter(m => m.playerId === p.id) || [];
    return legal.map(m => ({ player: p, move: m }));
  });

  const squares: React.ReactNode[] = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const item = cells.get(cellKey(r, c));
      const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

      if (isCenter) {
        if (r === 6 && c === 6) {
          squares.push(
            <div key="center" className="lp-center" style={{ gridColumn: "7 / span 3", gridRow: "7 / span 3" }}>
              <div className="lp-center-inner">
                <div className="lp-center-quad" style={{ background: COLORS.red }} />
                <div className="lp-center-quad" style={{ background: COLORS.green }} />
                <div className="lp-center-quad" style={{ background: COLORS.yellow }} />
                <div className="lp-center-quad" style={{ background: COLORS.blue }} />
              </div>
            </div>
          );
        }
        continue;
      }

      if (item?.type === "home") {
        const col = item.color!;
        // Tokens still inside this home are rendered here.
        // They only leave when the backend issues a legalMove whose destination
        // is the corresponding Home Gate (requires a 6).
        squares.push(
          <div
            key={cellKey(r, c)}
            className="lp-home"
            style={{
              gridRow: `${r + 1} / span 6`,
              gridColumn: `${c + 1} / span 6`,
              background: COLORS[col],
            }}
          >
            <div className="lp-homeinner" style={{ "--pawn": COLORS[col] } as React.CSSProperties}>
              {[0, 1, 2, 3].map(n => (
                <div className="lp-homehole" key={n}>
                  <span
                    className={`lp-token ${col}`}
                    style={{ position: "absolute", width: "62%", height: "74%", top: "8%", left: "19%" }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
        continue;
      }

      const isLane = item?.type === "lane";
      const legalHere = tokensOnBoard.filter(t => t.move.destination === item?.step);

      squares.push(
        <div
          key={cellKey(r, c)}
          className={`lp-cell ${item?.type === "path" ? "lp-path" : ""} ${item?.safe ? "safe" : ""}`}
          style={{
            gridRow: r + 1,
            gridColumn: c + 1,
            ...(isLane ? { background: COLORS[item.color!], boxShadow: "inset 0 0 0 2px #ffffff55" } : {}),
          }}
        >
          {legalHere.map(({ player, move }) => (
            <button
              key={move.tokenId}
              aria-label={`Move ${player.name}'s token`}
              onClick={() => onSelect(move.tokenId, move.destination)}
              className={`lp-token ${player.color} ${selectedToken === move.tokenId ? "selected" : ""}`}
              title="Select legal move"
            >
              ●
            </button>
          ))}

          {item?.safe && !legalHere.length && <span className="lp-star">⭐</span>}

          {item?.arrow && !legalHere.length && (
            <span
              className={`lp-arrow ${item.arrowColor || ""}`}
              style={isLane ? { color: "#fff", textShadow: "0 1px 2px #0006" } : undefined}
            >
              {item.arrow}
            </span>
          )}
        </div>
      );
    }
  }

  return (
    <div className="lp-boardwrap">
      <div className="lp-board">{squares}</div>
    </div>
  );
}

export default function LudoPrime({ backend, currentUser, onBack }: Props) {
  const [page, setPage] = useState<Page>("home");
  const [mode, setMode] = useState<"classic" | "aero">("classic");
  const [stake, setStake] = useState(0);
  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<{ matches: number; wins: number; earnings: number; winRate: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  // Local player is always presented as Tunde / YOU
  const me = currentUser
    ? { ...currentUser, name: "Tunde" }
    : { id: "local-tunde", name: "Tunde" };

  const activePlayer = match?.players.find(p => p.id === match?.currentPlayerId);
  const isMyTurn = !!me && match?.currentPlayerId === me.id;

  useEffect(() => {
    const s = document.createElement("style");
    s.setAttribute("data-ludoprime", "");
    s.textContent = styles;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  useEffect(() => {
    if (!match?.id || !backend?.subscribe) return;
    return backend.subscribe(match.id, (updated) => {
      setMatch(updated);
      // When the turn changes the dice value is cleared by the backend;
      // the UI automatically shows the die only on the new current player.
      setDice(updated.diceValue ?? null);
      setSelectedToken(null);
    });
  }, [match?.id, backend]);

  useEffect(() => {
    if (!match?.turnEndsAt) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.floor((new Date(match.turnEndsAt!).getTime() - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [match?.turnEndsAt]);

  const go = (p: Page) => { setError(""); setPage(p); };

  const requireBackend = () => {
    if (!backend) {
      setError("Connect your game backend to use live matchmaking, dice, moves and staking.");
      return false;
    }
    return true;
  };

  const findMatch = useCallback(async () => {
    if (!requireBackend()) return;
    setLoading(true);
    setError("");
    try {
      const found = await backend!.findMatch({ mode, stake });

      const otherNames = found.players.filter(p => p.id !== me.id && !p.isYou).map(p => p.name);
      const randomNames = pickRandomNames(3, ["Tunde", ...otherNames]);

      let nameIdx = 0;
      const normalizedPlayers = found.players.map(p => {
        if (p.id === me.id || p.isYou) {
          return {
            ...p,
            name: "Tunde",
            isYou: true,
            level: p.level ?? 5,
            country: p.country ?? "Nigeria",
            flag: p.flag ?? "🇳🇬",
            color: p.color || "red",
          };
        }
        return {
          ...p,
          name: randomNames[nameIdx++] || p.name,
          level: p.level ?? Math.floor(Math.random() * 12) + 3,
          country: p.country ?? (["Nigeria", "UK", "Canada", "USA", "Ghana"][Math.floor(Math.random() * 5)]),
          flag: p.flag ?? "🌍",
        };
      });

      setMatch({ ...found, players: normalizedPlayers });
      setDice(found.diceValue ?? null);
      setSelectedToken(null);
      setPage("match");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matchmaking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [backend, mode, stake, me.id]);

  const roll = async () => {
    if (!backend || !match || !isMyTurn || rolling) return;
    setRolling(true);
    setError("");
    try {
      const result = await backend.rollDice(match.id);
      setMatch(result.match);
      setDice(result.value);
      setSelectedToken(null);
      // Backend is responsible for:
      // - only offering Home-Gate entry moves when value === 6
      // - allowing extra turn on 6
      // - generating legalMoves that start counting from the Home Gate
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dice roll failed.");
    } finally {
      setRolling(false);
    }
  };

  const move = async (tokenId: string, destination: number) => {
    if (!backend || !match) return;
    setLoading(true);
    setError("");
    try {
      const updated = await backend.moveToken({ matchId: match.id, tokenId, destination });
      setMatch(updated);
      setDice(updated.diceValue ?? null); // cleared or kept if extra turn on 6
      setSelectedToken(null);
      if (updated.status === "finished") setPage("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Move rejected by server.");
    } finally {
      setLoading(false);
    }
  };

  const exitMatch = async () => {
    if (match && backend?.leaveMatch) {
      try { await backend.leaveMatch(match.id); } catch (e) {
        setError(e instanceof Error ? e.message : "Could not leave match.");
        return;
      }
    }
    setMatch(null);
    setPage("home");
  };

  const openStats = async () => {
    setError("");
    if (!backend?.getStats) { setStats(null); setPage("stats"); return; }
    setLoading(true);
    try { setStats(await backend.getStats()); setPage("stats"); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load statistics."); }
    finally { setLoading(false); }
  };

  const startAgain = async () => {
    if (!backend?.playAgain || !match) return;
    setLoading(true);
    try {
      const next = await backend.playAgain(match.id);
      setMatch(next);
      setPage("match");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start another match.");
    } finally { setLoading(false); }
  };

  const Back = ({ to = "home" }: { to?: Page }) => (
    <button className="lp-back" onClick={() => go(to)} aria-label="Go back">←</button>
  );

  /**
   * Dice appears ONLY on the profile card of the player whose turn it is.
   * When the turn passes, the die automatically moves to the next player's card.
   */
  const PlayerCard = ({ p }: { p: Player }) => {
    const isActive = p.id === match?.currentPlayerId;
    const showDice = isActive; // industry-standard turn indicator
    const displayName = p.isYou || p.id === me.id ? "Tunde" : p.name;
    const isYou = p.isYou || p.id === me.id;

    return (
      <div className={`lp-player-card ${p.color} ${isActive ? "active" : ""}`} style={{ flex: 1, maxWidth: "46%" }}>
        <div className="lp-avatar" style={{ borderColor: COLORS[p.color] }}>
          {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="lp-player-info">
          <div className="lp-playername">
            {displayName}
            {isYou && <span className="you-badge">YOU</span>}
          </div>
          <div className="lp-player-meta">
            <span>Lv.{p.level ?? 5}</span>
            <span>{p.flag ?? "🌍"} {p.country ?? ""}</span>
          </div>
        </div>
        {showDice && (
          <div className="lp-dice-slot" title="Current turn – roll when ready">
            {dice != null ? face[dice] : "🎲"}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`lp-root ${loading ? "lp-loading" : ""}`}>
      <div className="lp-shell">
        <div className="lp-top">
          <div className="lp-brand">
            <div className="lp-logo">🎲</div>
            LudoPrime
          </div>
          <div className="lp-topright">
            {match && (
              <div className="lp-pill">
                {match.status === "active" ? `Turn ${seconds}s` : match.status}
              </div>
            )}
            {onBack && <button className="lp-iconbtn" onClick={onBack} aria-label="Close">✕</button>}
          </div>
        </div>

        <div className="lp-content">
          {error && <div className="lp-error">{error}</div>}

          {page === "home" && (
            <>
              <div className="lp-hero">
                <div className="lp-eyebrow">Online Multiplayer</div>
                <h1 className="lp-h1">Classic Ludo with real stakes</h1>
                <p className="lp-sub">
                  Match with players worldwide. Fair dice, authoritative moves, instant payouts.
                </p>
                <div className="lp-actions">
                  <button className="lp-btn lp-primary" onClick={() => go("mode")}>Play Now</button>
                  <button className="lp-btn lp-secondary" onClick={openStats}>My Stats</button>
                </div>
              </div>
              <div className="lp-sectionhead"><h2>Quick actions</h2></div>
              <div className="lp-grid">
                <button className="lp-tile" onClick={() => go("mode")}>
                  <span className="emoji">🎯</span>
                  <strong>Find Match</strong>
                  <span>Classic or Aero mode</span>
                </button>
                <button className="lp-tile" onClick={openStats}>
                  <span className="emoji">📊</span>
                  <strong>Statistics</strong>
                  <span>Wins, earnings, win-rate</span>
                </button>
                <button className="lp-tile" onClick={() => go("leaderboard")}>
                  <span className="emoji">🏆</span>
                  <strong>Leaderboard</strong>
                  <span>Top players this week</span>
                </button>
              </div>
            </>
          )}

          {page === "mode" && (
            <div className="lp-panel">
              <div className="lp-backrow"><Back /><h1>Choose Mode</h1></div>
              <div className="lp-modes" style={{ marginTop: 18 }}>
                <button className="lp-mode" onClick={() => setMode("classic")}
                  style={mode === "classic" ? { borderColor: "#ffc75e" } : {}}>
                  <div className="modeicon">🎲</div>
                  <h3>Classic</h3>
                  <p>Standard Ludo. Only a 6 brings a seed out. First to get all four home wins.</p>
                </button>
                <button className="lp-mode aero" onClick={() => setMode("aero")}
                  style={mode === "aero" ? { borderColor: "#ffc75e" } : {}}>
                  <div className="modeicon">✈️</div>
                  <h3>Aero</h3>
                  <p>Faster variant with extra safe zones and quicker entries.</p>
                </button>
              </div>
              <div className="lp-actions" style={{ marginTop: 20 }}>
                <button className="lp-btn lp-primary" onClick={() => go("stake")}>Continue</button>
              </div>
            </div>
          )}

          {page === "stake" && (
            <div className="lp-panel">
              <div className="lp-backrow"><Back to="mode" /><h1>Select Stake</h1></div>
              <p className="lp-note" style={{ margin: "12px 0 18px" }}>Winner takes the pot. Choose 0 for free play.</p>
              <div className="lp-stakes">
                {[0, 10, 50, 100, 250, 500, 1000, 2500].map(v => (
                  <button key={v} className={`lp-stake ${stake === v ? "selected" : ""}`} onClick={() => setStake(v)}>
                    {v === 0 ? "Free" : `₹${v}`}
                  </button>
                ))}
              </div>
              <div className="lp-actions" style={{ marginTop: 22 }}>
                <button className="lp-btn lp-primary" onClick={findMatch} disabled={loading}>
                  {loading ? "Finding opponents…" : "Find Match"}
                </button>
              </div>
            </div>
          )}

          {page === "match" && match && (
            <>
              <div className="lp-players-top">
                {match.players
                  .filter(p => p.color === "green" || p.color === "yellow")
                  .sort((a, b) => (a.color === "green" ? -1 : 1))
                  .map(p => <PlayerCard key={p.id} p={p} />)}
              </div>

              <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
                <div className="lp-meet">
                  <div className="icon">🏠</div>
                  <span>Meet Here</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>(No Drop)</span>
                </div>
              </div>

              <Board
                match={match}
                currentUserId={me.id}
                selectedToken={selectedToken}
                onSelect={(tokenId, dest) => {
                  setSelectedToken(tokenId);
                  move(tokenId, dest);
                }}
              />

              <div className="lp-players-bottom">
                {match.players
                  .filter(p => p.color === "red" || p.color === "blue")
                  .sort((a, b) => (a.color === "red" ? -1 : 1))
                  .map(p => <PlayerCard key={p.id} p={p} />)}
              </div>

              <div className="lp-gamebottom">
                <div className="lp-turn">
                  <span className="dot" />
                  {activePlayer
                    ? (activePlayer.isYou || activePlayer.id === me.id)
                      ? "Your turn – roll the dice"
                      : `${activePlayer.name} is thinking…`
                    : "Waiting…"}
                </div>

                {isMyTurn && (
                  <button
                    className="lp-btn lp-primary"
                    onClick={roll}
                    disabled={rolling || (dice !== null && (match.legalMoves?.length ?? 0) > 0)}
                    style={{ minWidth: 130 }}
                  >
                    {rolling ? "Rolling…" : dice != null ? `Rolled ${dice}` : "Roll Dice"}
                  </button>
                )}

                <button className="lp-btn lp-danger" onClick={exitMatch}>Leave</button>
              </div>
            </>
          )}

          {page === "results" && match && (
            <div className="lp-panel" style={{ textAlign: "center" }}>
              <h1 style={{ fontFamily: "Space Grotesk", fontSize: 28 }}>
                {match.winnerId === me.id ? "You Won! 🎉" : "Match Over"}
              </h1>
              <p className="lp-muted" style={{ margin: "12px 0 24px" }}>
                {match.prizePool ? `Prize pool: ${match.prizePool}` : "Thanks for playing"}
              </p>
              <div className="lp-actions" style={{ justifyContent: "center" }}>
                <button className="lp-btn lp-primary" onClick={startAgain}>Play Again</button>
                <button className="lp-btn lp-secondary" onClick={() => go("home")}>Home</button>
              </div>
            </div>
          )}

          {page === "stats" && (
            <div className="lp-panel">
              <div className="lp-backrow"><Back /><h1>Your Stats</h1></div>
              {stats ? (
                <div className="lp-statgrid" style={{ marginTop: 18 }}>
                  <div className="lp-stat"><span>Matches</span><strong>{stats.matches}</strong></div>
                  <div className="lp-stat"><span>Wins</span><strong>{stats.wins}</strong></div>
                  <div className="lp-stat"><span>Win Rate</span><strong>{(stats.winRate * 100).toFixed(1)}%</strong></div>
                  <div className="lp-stat"><span>Earnings</span><strong>${stats.earnings}</strong></div>
                </div>
              ) : (
                <div className="lp-empty">Connect a backend that implements getStats() to see live numbers.</div>
              )}
            </div>
          )}

          {page === "leaderboard" && (
            <div className="lp-panel">
              <div className="lp-backrow"><Back /><h1>Leaderboard</h1></div>
              <div className="lp-empty" style={{ marginTop: 18 }}>Leaderboard data is supplied by your backend.</div>
            </div>
          )}
        </div>

        <div className="lp-footer">LudoPrime · Fair play · Authoritative server · Industry-standard rules</div>
      </div>
    </div>
  );
}