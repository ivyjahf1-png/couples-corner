import React, { useCallback, useEffect, useMemo, useState } from "react";

/**
 * LudoPrime — single-file responsive game UI.
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
.lp-stakes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.lp-stake{padding:12px 6px;border:1px solid #354769;border-radius:12px;background:#111d32;color:#fff;font-weight:700;font-size:12px;cursor:pointer}
.lp-stake.selected{border-color:#ffc75e;background:#473820;box-shadow:inset 0 0 0 1px #ffc75e}
.lp-note{font-size:12px;color:#9aabc8;line-height:1.5}
.lp-gamecontainer{display:flex;flex-direction:column;gap:14px;width:100%;align-items:center}
.lp-boardwrap{width:min(100%,min(62vh,580px));margin:0 auto;aspect-ratio:1;position:relative}
.lp-board{width:100%;height:100%;display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);border:4px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#f8fafc;box-shadow:0 15px 35px #0008}
.lp-cell{position:relative;border:1px solid #cbd5e1;background:#ffffff;display:grid;place-items:center;min-width:0;min-height:0}
.lp-cell.path{background:#ffffff}
.lp-cell.safe-classic{background:#fef08a}
.lp-cell.safe-aero{background:#fef08a}
.lp-center{grid-column:7/span 3;grid-row:7/span 3;position:relative;background:conic-gradient(from 45deg,#3185ef 0 25%,#ed5145 0 50%,#16b957 0 75%,#f4bd35 0);display:grid;place-items:center;clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,0 100%,0 0)}
.lp-center-star{font-size:clamp(16px,3vw,26px);color:#fff;text-shadow:0 2px 4px #0008;z-index:3}
.lp-homeyard{display:grid;place-items:center;border-radius:8px;padding:8px}
.lp-homeinner{width:70%;height:70%;background:#ffffff;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:12px;padding:12px;border:2px solid rgba(0,0,0,0.1)}
.lp-homehole{border-radius:50%;background:var(--yard-color);box-shadow:inset 0 2px 4px rgba(0,0,0,0.2);display:grid;place-items:center}
.lp-players-grid{display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:12px;width:100%;max-width:620px}
.lp-playerbox{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#111d30;border:1px solid #2d3c59;border-radius:14px;position:relative}
.lp-playerbox.active{border-color:#ffca70;box-shadow:0 0 0 1px #ffca7066;background:#182845}
.lp-playerinfo{display:flex;align-items:center;gap:10px}
.lp-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#273958;overflow:hidden;font-weight:800;font-size:12px}
.lp-avatar img{width:100%;height:100%;object-fit:cover}
.lp-player-dice-slot{display:flex;align-items:center;gap:8px}
.lp-mini-dice{width:38px;height:38px;border-radius:10px;background:linear-gradient(145deg,#fff,#d9e2f2);color:#18243c;display:grid;place-items:center;font-size:20px;font-weight:900;box-shadow:0 4px 10px #0004;cursor:pointer}
.lp-mini-dice:disabled{opacity:0.5;cursor:not-allowed}
.lp-token{width:75%;height:75%;border-radius:50%;background:var(--pawn);box-shadow:0 2px 4px #0004;display:grid;place-items:center;color:#fff;font-size:10px;font-weight:800;cursor:pointer}
.lp-token.selected{outline:2px solid #fff;outline-offset:1px;filter:brightness(1.2)}
.lp-error{padding:10px 13px;border-radius:12px;background:#542b38;border:1px solid #8d4a5c;color:#ffdce3;font-size:12px}
.lp-empty{padding:22px;border:1px dashed #3c4d6b;border-radius:15px;text-align:center;color:#aab8d1;font-size:13px;line-height:1.6}
.lp-statgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.lp-stat{padding:15px;border:1px solid #2d3e5c;border-radius:15px;background:#111d32}.lp-stat strong{display:block;font:700 23px 'Space Grotesk';margin-top:6px}.lp-stat span{font-size:10px;color:#9aabc8}
.lp-rankrow{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;padding:12px 2px;border-bottom:1px solid #293750}
.lp-ranknum{font-weight:800;color:#ffce72}
.lp-footer{display:flex;justify-content:center;gap:14px;padding:17px 0 2px;color:#71819e;font-size:10px}
@media(max-width:700px){
 .lp-root{padding:10px}.lp-shell{min-height:calc(100dvh - 20px)}
 .lp-players-grid{grid-template-columns:1fr}
 .lp-boardwrap{width:min(100%,calc(100vw - 28px),52vh)}
}
`;

const face: Record<number, string> = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };
const cellKey = (r: number, c: number) => `${r}-${c}`;

/**
 * Standard Ludo Board Renderer matching classic and aero design specifications.
 */
function Board({ match, selectedToken, onSelect }: {
  match: Match; selectedToken?: string | null; onSelect: (tokenId: string, destination: number) => void;
}) {
  const isAero = match.mode === "aero";

  const cells = useMemo(() => {
    const map = new Map<string, { type: string; color?: Player["color"]; safe?: boolean; step?: number }>();
    
    // Standard 52-step outer track path coordinates
    const path: Array<[number, number]> = [
      [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
      [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
      [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
      [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
    ];
    
    // Standard safe star/colored indices on standard ludo board
    const safeIndices = [0, 8, 13, 21, 26, 34, 39, 47];
    path.forEach(([r, c], i) => map.set(cellKey(r, c), { type: "path", safe: safeIndices.includes(i), step: i }));

    // Home yards
    const homes: Array<{ r: number; c: number; color: Player["color"] }> = [
      { r: 0, c: 0, color: "green" },
      { r: 0, c: 9, color: "yellow" },
      { r: 9, c: 0, color: "red" },
      { r: 9, c: 9, color: "blue" }
    ];
    homes.forEach(h => map.set(cellKey(h.r, h.c), { type: "home", color: h.color }));

    // Home lanes (home stretch)
    const lanes: Record<Player["color"], Array<[number, number]>> = {
      green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
      yellow: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
      blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
      red: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
    };
    Object.entries(lanes).forEach(([color, coords]) => coords.forEach(([r, c]) => map.set(cellKey(r, c), { type: "lane", color: color as Player["color"] })));
    
    return map;
  }, []);

  const tokens = (match.players || []).flatMap(p => {
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
              <span className="lp-center-star">★</span>
            </div>
          );
        }
        continue;
      }

      if (item?.type === "home") {
        const col = item.color!;
        squares.push(
          <div key={cellKey(r, c)} className="lp-homeyard" style={{ gridRow: `${r + 1} / span 6`, gridColumn: `${c + 1} / span 6`, background: COLORS[col] }}>
            <div className="lp-homeinner">
              {[0, 1, 2, 3].map(n => (
                <div key={n} className="lp-homehole" style={{ "--yard-color": COLORS[col] } as React.CSSProperties}>
                  <div className={`lp-token ${col}`} style={{ background: COLORS[col] }}>●</div>
                </div>
              ))}
            </div>
          </div>
        );
        continue;
      }

      const playerForCell = item?.type === "lane" ? item.color : undefined;
      const legalHere = tokens.filter(t => t.move.destination === item?.step);

      squares.push(
        <div
          key={cellKey(r, c)}
          className={`lp-cell ${item?.type === "path" ? "path" : ""} ${item?.safe ? (isAero ? "safe-aero" : "safe-classic") : ""}`}
          style={{
            gridRow: r + 1,
            gridColumn: c + 1,
            ...(playerForCell ? { background: COLORS[playerForCell], border: "1px solid rgba(255,255,255,0.4)" } : {})
          }}
        >
          {legalHere.map(({ player, move }) => (
            <button
              key={move.tokenId}
              aria-label="Move token"
              onClick={() => onSelect(move.tokenId, move.destination)}
              className={`lp-token ${player.color} ${selectedToken === move.tokenId ? "selected" : ""}`}
              style={{ background: COLORS[player.color] }}
            >
              ●
            </button>
          ))}
          {item?.safe && !legalHere.length ? (
            <span style={{ fontSize: "11px", color: isAero ? "#ca8a04" : "#b45309", fontWeight: 800 }}>
              {isAero ? "★" : "★"}
            </span>
          ) : null}
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
  const [stake, setStake] = useState(0); // in coins
  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<{ matches: number; wins: number; earnings: number; winRate: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const [seconds, setSeconds] = useState(0);

  const me = currentUser;
  const activePlayer = match?.players.find(p => p.id === match?.currentPlayerId);
  const isMyTurn = !!me && match?.currentPlayerId === me.id;
  const isMyTopTurnish = (isUser: boolean, myTurn: boolean) => isUser && myTurn;

  useEffect(() => {
    const s = document.createElement("style");
    s.setAttribute("data-ludoprime", "");
    s.textContent = styles;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  useEffect(() => {
    if (!match?.id || !backend?.subscribe) return;
    return backend.subscribe(match.id, setMatch);
  }, [match?.id, backend]);

  useEffect(() => {
    if (!match?.turnEndsAt) return;
    const tick = () => setSeconds(Math.max(0, Math.floor((new Date(match.turnEndsAt!).getTime() - Date.now()) / 1000)));
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
      setMatch(found);
      setDice(found.diceValue ?? null);
      setSelectedToken(null);
      setPage("match"); // Opens board directly upon finding/starting match
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matchmaking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [backend, mode, stake]);

  const roll = async () => {
    if (!backend || !match || !isMyTurn || rolling) return;
    setRolling(true);
    setError("");
    try {
      const result = await backend.rollDice(match.id);
      setMatch(result.match);
      setDice(result.value);
      setSelectedToken(null);
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
      setDice(updated.diceValue ?? null);
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
      try { await backend.leaveMatch(match.id); } catch (e) { setError(e instanceof Error ? e.message : "Could not leave match."); return; }
    }
    setMatch(null);
    setPage("home");
  };

  const openStats = async () => {
    setError("");
    if (!backend?.getStats) { setStats(null); setPage("stats"); return; }
    setLoading(true);
    try { setStats(await backend.getStats()); setPage("stats"); } catch (e) { setError(e instanceof Error ? e.message : "Could not load statistics."); } finally { setLoading(false); }
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
    } finally {
      setLoading(false);
    }
  };

  const Back = ({ to = "home" }: { to?: Page }) => <button className="lp-back" onClick={() => go(to)} aria-label="Go back">←</button>;

  return (
    <main className="lp-root">
      <div className="lp-shell">
        <header className="lp-top">
          <div className="lp-brand">
            <div className="lp-logo">♟</div>
            <span>LUDO<span style={{ color: "#ffc75e" }}>PRIME</span></span>
          </div>
          <div className="lp-topright">
            {me ? <div className="lp-pill">{me.name}</div> : <div className="lp-pill">Guest session</div>}
            <button className="lp-iconbtn" onClick={() => go("settings")} aria-label="Settings">⚙️</button>
          </div>
        </header>

        {error && <div className="lp-error" role="alert">{error}</div>}

        <div className={`lp-content ${loading ? "lp-loading" : ""}`}>
          {page === "home" && (
            <>
              <section className="lp-hero">
                <div className="lp-eyebrow">The next level of Ludo</div>
                <h1 className="lp-h1">ROLL BIG.<br />PLAY LIKE A LEGEND.</h1>
                <p className="lp-sub">A premium Ludo arena built for real competition. Choose Classic or Aero modes, stake up to 10M coins, and climb the leaderboard.</p>
                <div className="lp-actions">
                  <button className="lp-btn lp-primary" onClick={() => go("mode")}>Start game&nbsp; →</button>
                  <button className="lp-btn lp-secondary" onClick={() => go("leaderboard")}>Leaderboard</button>
                </div>
              </section>
              <div className="lp-sectionhead"><h2>Game centre</h2><span className="lp-muted">Choose your destination</span></div>
              <div className="lp-grid">
                <button className="lp-tile" onClick={() => go("mode")}><div className="emoji">🎮</div><strong>Play Ludo</strong><span>Classic and Aero arenas</span></button>
                <button className="lp-tile" onClick={() => go("stake")}><div className="emoji">🏆</div><strong>Staking</strong><span>Coin stakes up to 10M</span></button>
                <button className="lp-tile" onClick={() => go("leaderboard")}><div className="emoji">📊</div><strong>Rankings</strong><span>Compete with real players</span></button>
                <button className="lp-tile" onClick={openStats}><div className="emoji">📈</div><strong>My statistics</strong><span>Your match history and results</span></button>
              </div>
            </>
          )}

          {page === "mode" && (
            <>
              <div className="lp-backrow"><Back /><div><h1>Choose your arena</h1><div className="lp-muted">Select Classic or Aero mode</div></div></div>
              <div className="lp-modes">
                <button className="lp-mode" onClick={() => { setMode("classic"); go("stake"); }}>
                  <div className="modeicon">🎲</div>
                  <h3>Classic Ludo</h3>
                  <p>Traditional Ludo experience with standard paths and star-safe zones.</p>
                  <div className="lp-actions"><span className="lp-eyebrow">SELECT CLASSIC →</span></div>
                </button>
                <button className="lp-mode aero" onClick={() => { setMode("aero"); go("stake"); }}>
                  <div className="modeicon">🚀</div>
                  <h3>Aero Ludo</h3>
                  <p>Modern vibrant arena with optimized paths and distinct safe markers.</p>
                  <div className="lp-actions"><span className="lp-eyebrow">SELECT AERO →</span></div>
                </button>
              </div>
            </>
          )}

          {page === "stake" && (
            <>
              <div className="lp-backrow"><Back to="mode" /><div><h1>Match entry & staking</h1><div className="lp-muted">{mode === "classic" ? "Classic" : "Aero"} arena · Choose coin stake up to 10M</div></div></div>
              <section className="lp-panel">
                <div className="lp-sectionhead"><h2>Choose coin entry amount</h2><span className="lp-muted">Up to 10M coins</span></div>
                <div className="lp-stakes" style={{ marginTop: 16 }}>
                  {[0, 2000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000].map(v => (
                    <button key={v} className={`lp-stake ${stake === v ? "selected" : ""}`} onClick={() => setStake(v)}>
                      {v === 0 ? "Free" : v >= 1000000 ? `${v / 1000000}M Coins` : `${v.toLocaleString()} Coins`}
                    </button>
                  ))}
                </div>
                <p className="lp-note" style={{ marginTop: 15 }}>Staking escrow and wallet balance checks are validated securely by your backend.</p>
                <div className="lp-actions">
                  <button className="lp-btn lp-primary" onClick={findMatch} disabled={loading}>{loading ? "Finding players…" : "Start game →"}</button>
                  <button className="lp-btn lp-secondary" onClick={() => go("home")}>Cancel</button>
                </div>
              </section>
            </>
          )}

          {page === "match" && match && (
            <div className="lp-gamecontainer">
              <div className="lp-gamehead" style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="lp-backrow"><button className="lp-back" onClick={exitMatch}>←</button><div><div style={{ fontWeight: 800, fontSize: 14 }}>Ludo arena ({match.mode === "aero" ? "Aero" : "Classic"})</div><div className="lp-muted">Stake: {match.stake ? `${match.stake.toLocaleString()} Coins` : "Free"}</div></div></div>
                <div className="lp-topright"><div className="lp-pill">⏱️ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</div><button className="lp-iconbtn" onClick={() => setSound(!sound)}>{sound ? "♫" : "♩"}</button></div>
              </div>

              {/* Player profile cards placed directly below/around the board layout with active dice next to the active player */}
              <div className="lp-players-grid">
                {(match.players || []).map(p => {
                  const isActive = p.id === match.currentPlayerId;
                  const isUser = p.id === me?.id || !!p.isYou;
                  return (
                    <div key={p.id} className={`lp-playerbox ${isActive ? "active" : ""}`}>
                      <div className="lp-playerinfo">
                        <div className="lp-avatar" style={{ border: `2px solid ${COLORS[p.color]}` }}>
                          {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : (isUser ? "YOU" : p.name.slice(0, 1).toUpperCase())}
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 800 }}>{isUser ? "YOU" : p.name} ({p.color})</div>
                          <div style={{ fontSize: "10px", color: "#9aabc8" }}>{isActive ? "● Active Turn" : "Connected"}</div>
                        </div>
                      </div>
                      <div className="lp-player-dice-slot">
                        {isActive && (
                          <button
                            className="lp-mini-dice"
                            onClick={roll}
                            disabled={!isMyTopTurnish(isUser, isMyTurn) || rolling}
                            title="Roll Dice"
                          >
                            {rolling ? "..." : (dice ? face[dice] : "⚄")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Board match={match} selectedToken={selectedToken} onSelect={(id, dest) => { setSelectedToken(id); move(id, dest); }} />
            </div>
          )}

          {page === "match" && !match && (
            <><div className="lp-backrow"><Back /><h1>No active match</h1></div><div className="lp-empty">Start a game to enter the arena.</div></>
          )}

          {page === "results" && (
            <>
              <div className="lp-backrow"><Back /><h1>Match results</h1></div>
              <section className="lp-hero" style={{ textAlign: "center" }}><div style={{ fontSize: 52 }}>🏆</div><div className="lp-eyebrow">Match complete</div><h1 className="lp-h1" style={{ fontSize: 38, marginInline: "auto" }}>{match?.winnerId === me?.id ? "VICTORY!" : "GAME FINISHED"}</h1></section>
              <div className="lp-actions"><button className="lp-btn lp-primary" onClick={startAgain} disabled={!backend?.playAgain}>Play again</button><button className="lp-btn lp-secondary" onClick={exitMatch}>Return to lobby</button></div>
            </>
          )}

          {page === "leaderboard" && (
            <>
              <div className="lp-backrow"><Back /><div><h1>Leaderboard</h1><div className="lp-muted">Live rankings</div></div></div>
              <div className="lp-panel"><div className="lp-empty">Connect your game endpoint to display rankings.</div></div>
            </>
          )}

          {page === "stats" && (
            <>
              <div className="lp-backrow"><Back /><div><h1>Match statistics</h1></div></div>
              {stats ? <div className="lp-statgrid"><div className="lp-stat"><span>Matches</span><strong>{stats.matches}</strong></div><div className="lp-stat"><span>Wins</span><strong>{stats.wins}</strong></div></div> : <div className="lp-empty">No statistics recorded yet.</div>}
            </>
          )}

          {page === "settings" && (
            <>
              <div className="lp-backrow"><Back /><div><h1>Settings</h1></div></div>
              <div className="lp-panel"><strong>Preferences</strong><div className="lp-muted">Sound and account settings</div></div>
            </>
          )}
        </div>
        <footer className="lp-footer"><span>LUDOPRIME</span><span>REAL PLAYERS · FAIR PLAY</span><span>© {new Date().getFullYear()}</span></footer>
      </div>
    </main>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// NEW FEATURES EXTENSION MODULE (Paste into your project or integrate with LudoPrime)
// ─────────────────────────────────────────────────────────────────────────────

// 1. Updated Interfaces & Backend Interface with AI / Computer Support
export type LudoGameMode = "classic" | "aero";
export type OpponentType = "online" | "computer";

export interface ExtendedMatchBackend {
  findMatch: (args: { mode: LudoGameMode; stake: number; isComputer: boolean }) => Promise<any>;
  rollDice: (matchId: string) => Promise<{ value: number; match: any }>;
  moveToken: (args: { matchId: string; tokenId: string; destination: number }) => Promise<any>;
  leaveMatch?: (matchId: string) => Promise<void>;
  subscribe?: (matchId: string, onMatch: (match: any) => void) => (() => void);
}

// 2. Separate Opponent-Selection Component Page
export function OpponentSelectionView({
  onSelectOpponent,
  onBack,
}: {
  onSelectOpponent: (type: OpponentType) => void;
  onBack: () => void;
}) {
  return (
    <div className="lp-panel">
      <div className="lp-backrow">
        <button className="lp-back" onClick={onBack}>←</button>
        <div>
          <h1>Select Opponent Type</h1>
          <div className="lp-muted">Choose whether to play online or against server AI</div>
        </div>
      </div>
      <div className="lp-modes" style={{ marginTop: 20 }}>
        <button className="lp-mode" onClick={() => onSelectOpponent("online")}>
          <div className="modeicon">🌐</div>
          <h3>Online Match</h3>
          <p>Match with real human players across the network.</p>
          <div className="lp-actions"><span className="lp-eyebrow">SELECT ONLINE →</span></div>
        </button>
        <button className="lp-mode aero" onClick={() => onSelectOpponent("computer")}>
          <div className="modeicon">🤖</div>
          <h3>Computer AI Match</h3>
          <p>Play against server-controlled intelligent bot opponents.</p>
          <div className="lp-actions"><span className="lp-eyebrow">SELECT AI BOT →</span></div>
        </button>
      </div>
    </div>
  );
}

// 3. Pre-Gameplay Entry & Coin Staking Configuration (Supports up to 10M coins)
export function CoinStakingConfigView({
  opponentType,
  mode,
  onStartGame: handleStartMatch,
  onBack,
}: {
  opponentType: OpponentType;
  mode: LudoGameMode;
  onStartGame: (stake: number) => void;
  onBack: () => void;
}) {
  const [selectedStake, setSelectedStake] = useState<number>(0);
  const coinOptions = [0, 2000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000];

  return (
    <div className="lp-panel">
      <div className="lp-backrow">
        <button className="lp-back" onClick={onBack}>←</button>
        <div>
          <h1>Match Entry & Staking</h1>
          <div className="lp-muted">
            {opponentType === "computer" ? "Computer AI" : "Online"} · {mode.toUpperCase()} Arena
          </div>
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <div className="lp-sectionhead">
          <h2>Choose entry amount</h2>
          <span className="lp-muted">Up to 10M coins selection</span>
        </div>
        <div className="lp-stakes" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {coinOptions.map((v) => (
            <button
              key={v}
              className={`lp-stake ${selectedStake === v ? "selected" : ""}`}
              onClick={() => setSelectedStake(v)}
              style={{ padding: "12px", border: "1px solid #354769", borderRadius: "12px", background: selectedStake === v ? "#473820" : "#111d32", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              {v === 0 ? "Free" : v >= 1000000 ? `${v / 1000000}M Coins` : `${v.toLocaleString()} Coins`}
            </button>
          ))}
        </div>
        <p className="lp-note" style={{ marginTop: 15, color: "#9aabc8", fontSize: "12px" }}>
          Staking escrow and wallet balances are verified and managed securely via the backend server.
        </p>
        <div className="lp-actions" style={{ marginTop: 20 }}>
          <button className="lp-btn lp-primary" onClick={() => handleStartMatch(selectedStake)}>
            Start Game Board →
          </button>
        </div>
      </div>
    </div>
  );
}

// 4. Shared Gameplay Board UI with Per-Player Dice Placement
export function SharedMatchGameplayView({
  match,
  currentUserId,
  diceValue,
  rolling,
  onRollDice,
  onSelectToken,
  selectedToken,
  onExit,
}: {
  match: any;
  currentUserId?: string;
  diceValue: number | null;
  rolling: boolean;
  onRollDice: () => void;
  onSelectToken: (tokenId: string, dest: number) => void;
  selectedToken: string | null;
  onExit: () => void;
}) {
  const activePlayer = match?.players?.find((p: any) => p.id === match?.currentPlayerId);
  const isMyTurn = !!currentUserId && match?.currentPlayerId === currentUserId;

  return (
    <div className="lp-gamecontainer" style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", alignItems: "center" }}>
      <div className="lp-gamehead" style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="lp-backrow">
          <button className="lp-back" onClick={onExit}>←</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {match.isComputerMatch ? "Computer AI Arena" : "Online Arena"} ({match.mode?.toUpperCase()})
            </div>
            <div className="lp-muted">Stake: {match.stake ? `${match.stake.toLocaleString()} Coins` : "Free"}</div>
          </div>
        </div>
      </div>

      {/* Players cards placed with temporary dice beside active player profile */}
      <div className="lp-players-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(260px, 1fr))", gap: 12, width: "100%", maxWidth: 620 }}>
        {(match.players || []).map((p: any) => {
          const isActive = p.id === match.currentPlayerId;
          const isUser = p.id === currentUserId || p.isYou;
          return (
            <div key={p.id} className={`lp-playerbox ${isActive ? "active" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: isActive ? "#182845" : "#111d30", border: "1px solid #2d3c59", borderRadius: "14px" }}>
              <div className="lp-playerinfo" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="lp-avatar" style={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", background: "#273958", border: "2px solid var(--p-color)" }}>
                  {p.avatarUrl ? <img src={p.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : (isUser ? "YOU" : p.name.slice(0, 1))}
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800 }}>{isUser ? "YOU" : p.name} {p.isBot ? "🤖" : ""}</div>
                  <div style={{ fontSize: "10px", color: "#9aabc8" }}>{isActive ? (p.isBot ? "● AI Thinking..." : "● Active Turn") : "Connected"}</div>
                </div>
              </div>
              <div className="lp-player-dice-slot">
                {isActive && !p.isBot && (
                  <button className="lp-mini-dice" onClick={onRollDice} disabled={!isMyTurn || rolling} style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", color: "#18243c", fontWeight: 900, cursor: "pointer" }}>
                    {rolling ? "..." : (diceValue ? diceValue : "⚄")}
                  </button>
                )}
                {isActive && p.isBot && (
                  <div style={{ fontSize: "18px" }} title="Server AI is rolling dice and making moves">🤖</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}