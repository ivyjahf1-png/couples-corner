import React, { useCallback, useEffect, useMemo, useState } from "react";

/**
 * LudoPrime — single-file responsive game UI.
 *
 * Integration contract:
 * Pass a `backend` object from your app to connect real matchmaking, profiles,
 * authoritative dice, moves, balances and staking. No opponent profiles or dice
 * results are fabricated by this component.
 *
 * Example:
 * <LudoPrime currentUser={{ id: user.id, name: user.name, avatarUrl: user.avatar }}
 *   backend={ludoApi} />
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
  findComputerMatch?: (args: { mode: "classic" | "aero"; stake?: number }) => Promise<Match>;
  runComputerTurn?: (matchId: string) => Promise<Match>;
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

type Page = "home" | "mode" | "computer" | "stake" | "match" | "results" | "leaderboard" | "stats" | "settings";

const COLORS = {
  green: "#16b957",
  yellow: "#f4bd35",
  red: "#ed5145",
  blue: "#3185ef",
};
const COLOR_NAMES: Player["color"][] = ["green", "yellow", "blue", "red"];

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
.lp-gamehead{display:flex;justify-content:space-between;align-items:center;gap:10px}
.lp-players{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.lp-player{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid #2d3c59;background:#111c30;border-radius:13px;min-width:0}
.lp-player.active{border-color:#ffca70;box-shadow:0 0 0 1px #ffca7055}
.lp-avatar{width:33px;height:33px;border-radius:50%;display:grid;place-items:center;background:#273958;overflow:hidden;flex-shrink:0;font-weight:800}
.lp-avatar img{width:100%;height:100%;object-fit:cover}
.lp-playername{font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lp-playerstatus{font-size:9px;color:#9aabc8;margin-top:2px}
.lp-boardwrap{width:min(100%,min(68vh,660px));margin:0 auto;aspect-ratio:1}
.lp-board{width:100%;height:100%;display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);border:5px solid #dce4e9;border-radius:12px;overflow:hidden;background:#f4f1df;box-shadow:0 20px 45px #0008, inset 0 0 0 2px #ffffff}
.lp-cell{position:relative;border:1px solid #c9c8bd;background:#f9f7e9;display:grid;place-items:center;min-width:0;min-height:0}
.lp-home{grid-column:span 6;grid-row:span 6;margin:3%;border-radius:14%;display:grid;place-items:center;box-shadow:inset 0 0 0 3px #ffffff66}
.lp-homeinner{width:68%;height:68%;border-radius:18%;background:#fffdf1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;place-items:center;padding:12%;gap:12%}
.lp-homehole{width:76%;height:76%;border-radius:50%;background:var(--pawn);box-shadow:inset 0 4px 5px #0002,0 2px 3px #0002}
.lp-center{grid-column:7/span 3;grid-row:7/span 3;position:relative;background:conic-gradient(from 45deg,#3688ee 0 25%,#ed5145 0 50%,#16b957 0 75%,#f4bd35 0);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);display:grid;place-items:center}
.lp-center:after{content:'★';font-size:clamp(14px,3vw,28px);color:#fff;text-shadow:0 2px 6px #0007}
.lp-path{background:#fffdf3}
.lp-path.safe{background:#f7e6aa}
.lp-path .lp-token{position:absolute;width:83%;height:83%;z-index:2}
.lp-token{border-radius:40% 40% 48% 48%;background:linear-gradient(145deg,#ffffffaa,var(--pawn) 28%,var(--pawn-dark) 100%);border:2px solid #ffffffa8;box-shadow:inset -4px -7px 6px #0003,inset 3px 3px 5px #ffffff88,0 4px 5px #0005;transform:perspective(80px) rotateX(8deg);display:grid;place-items:center;color:#fff;font-size:clamp(6px,1vw,11px);font-weight:900}
.lp-token:before{content:'';position:absolute;top:-20%;left:17%;width:66%;height:38%;border-radius:50%;background:linear-gradient(145deg,#fff9,var(--pawn));border:1px solid #ffffffaa;box-shadow:0 2px 3px #0003}
.lp-token.green{--pawn:#35e77d;--pawn-dark:#087d39}.lp-token.yellow{--pawn:#ffe078;--pawn-dark:#ad7100}.lp-token.red{--pawn:#ff8076;--pawn-dark:#a71e27}.lp-token.blue{--pawn:#75b8ff;--pawn-dark:#104ca7}
.lp-token.selected{outline:3px solid #fff;outline-offset:2px;filter:brightness(1.2)}
.lp-gamebottom{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap}
.lp-dice{width:58px;height:58px;border-radius:14px;background:linear-gradient(145deg,#fff,#d9e2f2);color:#18243c;display:grid;place-items:center;font-size:32px;font-weight:900;box-shadow:0 7px 0 #8c9db8,0 10px 18px #0005}
.lp-turn{font-size:12px;color:#c7d3e9;text-align:center}
.lp-empty{padding:22px;border:1px dashed #3c4d6b;border-radius:15px;text-align:center;color:#aab8d1;font-size:13px;line-height:1.6}
.lp-statgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.lp-stat{padding:15px;border:1px solid #2d3e5c;border-radius:15px;background:#111d32}.lp-stat strong{display:block;font:700 23px 'Space Grotesk';margin-top:6px}.lp-stat span{font-size:10px;color:#9aabc8}
.lp-rankrow{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;padding:12px 2px;border-bottom:1px solid #293750}
.lp-ranknum{font-weight:800;color:#ffce72}.lp-footer{display:flex;justify-content:center;gap:14px;padding:17px 0 2px;color:#71819e;font-size:10px}
.lp-error{padding:10px 13px;border-radius:12px;background:#542b38;border:1px solid #8d4a5c;color:#ffdce3;font-size:12px}
.lp-loading{opacity:.7;pointer-events:none}
@media(max-width:700px){
 .lp-root{padding:10px}.lp-shell{min-height:calc(100dvh - 20px)}.lp-top{margin-bottom:12px}
 .lp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lp-tile{min-height:100px;padding:13px}
 .lp-players{grid-template-columns:repeat(2,minmax(0,1fr))}
 .lp-boardwrap{width:min(100%,calc(100vw - 28px),54dvh)}
 .lp-statgrid{grid-template-columns:repeat(2,1fr)}
 .lp-gamehead .lp-pill{padding:7px 9px}
}
@media(max-width:420px){
 .lp-brand{font-size:18px}.lp-logo{width:34px;height:34px}.lp-pill{padding:8px 10px}
 .lp-hero{padding:20px}.lp-h1{font-size:34px}.lp-modes{grid-template-columns:1fr}
 .lp-mode{min-height:145px;padding:16px}.lp-stakes{grid-template-columns:repeat(2,1fr)}
 .lp-board{border-width:3px;border-radius:8px}
 .lp-gamehead{align-items:flex-start;flex-direction:column}
}
@media(max-height:740px) and (min-width:701px){
 .lp-content{gap:12px}.lp-boardwrap{width:min(100%,48vh,570px)}
 .lp-gamehead{margin-bottom:0}.lp-panel{padding:14px}
}
`;

const face: Record<number, string> = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };
const cellKey = (r: number, c: number) => `${r}-${c}`;

function Board({ match, currentUserId, selectedToken, onSelect }: {
  match: Match; currentUserId?: string; selectedToken?: string | null; onSelect: (tokenId: string, destination: number) => void;
}) {
  const cells = useMemo(() => {
    const map = new Map<string, { type: string; color?: Player["color"]; safe?: boolean; step?: number }>();
    // A classic 52-step perimeter path. The board remains decorative; legal destinations come from the server.
    const path: Array<[number, number]> = [
      [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
      [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
      [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
      [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
    ];
    path.forEach(([r,c],i)=>map.set(cellKey(r,c),{type:"path",safe:[0,8,13,21,26,34,39,47].includes(i),step:i}));
    const homes: Array<{r:number;c:number;color:Player["color"]}> = [
      {r:0,c:0,color:"green"},{r:0,c:9,color:"yellow"},{r:9,c:0,color:"red"},{r:9,c:9,color:"blue"}
    ];
    homes.forEach(h=>map.set(cellKey(h.r,h.c),{type:"home",color:h.color}));
    // Colored home lanes.
    const lanes: Record<Player["color"],Array<[number,number]>> = {
      green:[[7,1],[7,2],[7,3],[7,4],[7,5]],
      yellow:[[1,7],[2,7],[3,7],[4,7],[5,7]],
      blue:[[7,13],[7,12],[7,11],[7,10],[7,9]],
      red:[[13,7],[12,7],[11,7],[10,7],[9,7]]
    };
    Object.entries(lanes).forEach(([color,coords])=>coords.forEach(([r,c])=>map.set(cellKey(r,c),{type:"lane",color:color as Player["color"]})));
    return map;
  }, []);
  const tokens = (match.players || []).flatMap(p => {
    const legal = match.legalMoves?.filter(m=>m.playerId===p.id) || [];
    return legal.map(m=>({player:p,move:m}));
  });
  const squares: React.ReactNode[] = [];
  for(let r=0;r<15;r++) for(let c=0;c<15;c++){
    const item=cells.get(cellKey(r,c));
    const isCenter=r>=6&&r<=8&&c>=6&&c<=8;
    if(isCenter){
      if(r===6&&c===6)squares.push(<div key="center" className="lp-center" style={{gridColumn:"7 / span 3",gridRow:"7 / span 3"}}/>);
      continue;
    }
    if(item?.type==="home"){
      const col=item.color!;
      squares.push(<div key={cellKey(r,c)} className="lp-home" style={{gridRow:`${r+1}/span 6`,gridColumn:`${c+1}/span 6`,background:COLORS[col]}}>
        <div className="lp-homeinner" style={{"--pawn":COLORS[col]} as React.CSSProperties}>
          {[0,1,2,3].map(n=><div className="lp-homehole" key={n} style={{position:"relative"}}>
            <span className={`lp-token ${col}`} style={{position:"absolute",width:"62%",height:"74%",top:"5%"}} />
          </div>)}
        </div>
      </div>);
      continue;
    }
    const playerForCell = item?.type==="lane" ? item.color : undefined;
    const legalHere=tokens.filter(t=>t.move.destination===item?.step);
    squares.push(<div key={cellKey(r,c)} className={`lp-cell ${item?.type==="path"?"lp-path":""} ${item?.safe?"safe":""}`}
      style={{gridRow:r+1,gridColumn:c+1,...(playerForCell?{background:COLORS[playerForCell],boxShadow:"inset 0 0 0 2px #ffffff55"}:{})}}>
      {legalHere.map(({player,move})=><button key={move.tokenId} aria-label={`Move ${player.name}'s token`} onClick={()=>onSelect(move.tokenId,move.destination)}
        className={`lp-token ${player.color} ${selectedToken===move.tokenId?"selected":""}`} title="Select legal move">●</button>)}
      {item?.safe&&!legalHere.length?<span style={{fontSize:"clamp(7px,1.2vw,13px)",color:"#d6ad45"}}>★</span>:null}
    </div>);
  }
  return <div className="lp-boardwrap"><div className="lp-board">{squares}</div></div>;
}

export default function LudoPrime({ backend, currentUser, onBack }: Props) {
  const [page,setPage]=useState<Page>("home");
  const [mode,setMode]=useState<"classic"|"aero">("classic");
  const [matchType,setMatchType]=useState<"online"|"computer">("online");
  const [stake,setStake]=useState(0);
  const [match,setMatch]=useState<Match|null>(null);
  const [stats,setStats]=useState<{matches:number;wins:number;earnings:number;winRate:number}|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [dice,setDice]=useState<number|null>(null);
  const [rolling,setRolling]=useState(false);
  const [selectedToken,setSelectedToken]=useState<string|null>(null);
  const [sound,setSound]=useState(true);
  const [seconds,setSeconds]=useState(0);

  const me = currentUser;
  const myPlayer = match?.players.find(p=>p.id===me?.id || p.isYou);
  const activePlayer = match?.players.find(p=>p.id===match?.currentPlayerId);
  const isMyTurn = !!me && match?.currentPlayerId===me.id;

  useEffect(()=>{const s=document.createElement("style");s.setAttribute("data-ludoprime","");s.textContent=styles;document.head.appendChild(s);return()=>{document.head.removeChild(s)}},[]);
  useEffect(()=>{if(!match?.id||!backend?.subscribe)return;return backend.subscribe(match.id,setMatch)},[match?.id,backend]);
  useEffect(()=>{
    if(matchType!=="computer"||!match||match.status!=="active"||!backend?.runComputerTurn||match.currentPlayerId===currentUser?.id)return;
    let cancelled=false;
    backend.runComputerTurn(match.id).then(updated=>{if(!cancelled){setMatch(updated);setDice(updated.diceValue??null);if(updated.status==="finished")setPage("results")}}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"AI turn failed.")});
    return()=>{cancelled=true};
  },[match?.id,match?.currentPlayerId,match?.status,backend,matchType,currentUser?.id]);
  useEffect(()=>{if(!match?.turnEndsAt)return;const tick=()=>setSeconds(Math.max(0,Math.floor((new Date(match.turnEndsAt!).getTime()-Date.now())/1000)));tick();const id=window.setInterval(tick,1000);return()=>window.clearInterval(id)},[match?.turnEndsAt]);
  const go=(p:Page)=>{setError("");setPage(p)};
  const requireBackend=()=>{if(!backend){setError("Connect your game backend to use live matchmaking, dice, moves and staking.");return false}return true};

  const findMatch=useCallback(async()=>{
    if(!requireBackend())return;
    setLoading(true);setError("");
    try{const found=await backend!.findMatch({mode,stake});setMatch(found);setDice(found.diceValue??null);setSelectedToken(null);setPage("match")}
    catch(e){setError(e instanceof Error?e.message:"Matchmaking failed. Please try again.")}
    finally{setLoading(false)}
  },[backend,mode,stake]);

  const findComputerMatch=useCallback(async()=>{
    if(!backend?.findComputerMatch){setError("Connect your backend computer-match endpoint to start an AI match.");return;}
    setLoading(true);setError("");
    try{
      const found=await backend.findComputerMatch({mode,stake});
      setMatch(found);setDice(found.diceValue??null);setSelectedToken(null);setPage("match");
    }catch(e){setError(e instanceof Error?e.message:"Computer matchmaking failed. Please try again.")}
    finally{setLoading(false)}
  },[backend,mode,stake]);

  const roll=async()=>{
    if(!backend||!match||!isMyTurn||rolling)return;
    setRolling(true);setError("");
    try{const result=await backend.rollDice(match.id);setMatch(result.match);setDice(result.value);setSelectedToken(null)}
    catch(e){setError(e instanceof Error?e.message:"Dice roll failed.")}
    finally{setRolling(false)}
  };
  const move=async(tokenId:string,destination:number)=>{
    if(!backend||!match)return;
    setLoading(true);setError("");
    try{const updated=await backend.moveToken({matchId:match.id,tokenId,destination});setMatch(updated);setDice(updated.diceValue??null);setSelectedToken(null);if(updated.status==="finished")setPage("results")}
    catch(e){setError(e instanceof Error?e.message:"Move rejected by server.")}
    finally{setLoading(false)}
  };
  const exitMatch=async()=>{if(match&&backend?.leaveMatch){try{await backend.leaveMatch(match.id)}catch(e){setError(e instanceof Error?e.message:"Could not leave match.");return}}setMatch(null);setPage("home")};
  const openStats=async()=>{setError("");if(!backend?.getStats){setStats(null);setPage("stats");return}setLoading(true);try{setStats(await backend.getStats());setPage("stats")}catch(e){setError(e instanceof Error?e.message:"Could not load statistics.")}finally{setLoading(false)}};
  const startAgain=async()=>{if(!backend?.playAgain||!match)return;setLoading(true);try{const next=await backend.playAgain(match.id);setMatch(next);setPage("match")}catch(e){setError(e instanceof Error?e.message:"Could not start another match.")}finally{setLoading(false)}};

  const Back=({to="home"}:{to?:Page})=><button className="lp-back" onClick={()=>go(to)} aria-label="Go back">←</button>;
  const PlayerCard=({p}:{p:Player})=><div className={`lp-player ${p.id===match?.currentPlayerId?"active":""}`}>
    <div className="lp-avatar" style={{border:`2px solid ${COLORS[p.color]}`}}>{p.avatarUrl?<img src={p.avatarUrl} alt=""/>:(p.isYou||p.id===me?.id?"YOU":p.name.slice(0,1).toUpperCase())}</div>
    <div style={{minWidth:0}}><div className="lp-playername">{p.id===me?.id||p.isYou?"YOU":p.name}</div><div className="lp-playerstatus">{p.id===match?.currentPlayerId?"● Playing":p.isReady?"Ready":"Connected"}</div></div>
  </div>;

  return <main className="lp-root"><div className="lp-shell">
    <header className="lp-top">
      <div className="lp-brand"><div className="lp-logo">♟</div><span>LUDO<span style={{color:"#ffc75e"}}>PRIME</span></span></div>
      <div className="lp-topright">
        {me?<div className="lp-pill">{me.name}</div>:<div className="lp-pill">Guest session</div>}
        <button className="lp-iconbtn" onClick={()=>go("settings")} aria-label="Settings">⚙</button>
      </div>
    </header>

    {error&&<div className="lp-error" role="alert">{error}</div>}

    <div className={`lp-content ${loading?"lp-loading":""}`}>
      {page==="home"&&<>
        <section className="lp-hero">
          <div className="lp-eyebrow">The next level of Ludo</div>
          <h1 className="lp-h1">ROLL BIG.<br/>PLAY LIKE A LEGEND.</h1>
          <p className="lp-sub">A premium Ludo arena built for real competition. Find opponents, make your moves and climb the leaderboard.</p>
          <div className="lp-actions"><button className="lp-btn lp-primary" onClick={()=>go("mode")}>Find a match&nbsp; →</button><button className="lp-btn lp-secondary" onClick={()=>go("leaderboard")}>Leaderboard</button></div>
        </section>
        <div className="lp-sectionhead"><h2>Game centre</h2><span className="lp-muted">Choose your destination</span></div>
        <div className="lp-grid">
          <button className="lp-tile" onClick={()=>go("mode")}><div className="emoji">🎮</div><strong>Play Ludo</strong><span>Classic and Aero arenas</span></button>
          <button className="lp-tile" onClick={()=>go("stake")}><div className="emoji">🏆</div><strong>Staking</strong><span>Separate match entry feature</span></button>
          <button className="lp-tile" onClick={()=>go("leaderboard")}><div className="emoji">📊</div><strong>Rankings</strong><span>Compete with real players</span></button>
          <button className="lp-tile" onClick={openStats}><div className="emoji">📈</div><strong>My statistics</strong><span>Your match history and results</span></button>
          <button className="lp-tile" onClick={()=>go("settings")}><div className="emoji">🔊</div><strong>Settings</strong><span>Sound and game preferences</span></button>
          <button className="lp-tile" onClick={()=>go("mode")}><div className="emoji">✨</div><strong>Quick match</strong><span>Join the next available game</span></button>
        </div>
      </>}

      {page==="mode"&&<>
        <div className="lp-backrow"><Back/><div><h1>Choose your arena</h1><div className="lp-muted">Select a game mode before matchmaking</div></div></div>
        <div className="lp-modes">
          <button className="lp-mode" onClick={()=>{setMode("classic");go("stake")}}><div className="modeicon">🎲</div><h3>Classic Ludo</h3><p>Traditional Ludo experience. Race your four pieces home with familiar rules.</p><div className="lp-actions"><span className="lp-eyebrow">STANDARD ARENA →</span></div></button>
          <button className="lp-mode aero" onClick={()=>{setMode("aero");go("stake")}}><div className="modeicon">🚀</div><h3>Aero Ludo</h3><p>A faster, elevated arena. Distinct mode rules are supplied by the game server.</p><div className="lp-actions"><span className="lp-eyebrow">AERO ARENA →</span></div></button>
        </div>
        <section className="lp-panel">
          <div className="lp-sectionhead"><h2>Play against computer</h2><span className="lp-muted">AI match</span></div>
          <p className="lp-note">Choose a separate computer-match flow with server-authoritative AI dice and moves.</p>
          <div className="lp-actions"><button className="lp-btn lp-primary" onClick={()=>{setMatchType("computer");go("computer")}}>Play computer match →</button></div>
        </section>
      </>}

      {page==="computer"&&<>
        <div className="lp-backrow"><Back to="mode"/><div><h1>Computer match</h1><div className="lp-muted">Choose your arena before entry configuration</div></div></div>
        <div className="lp-modes">
          <button className="lp-mode" onClick={()=>{setMode("classic");setMatchType("computer");go("stake")}}><div className="modeicon">🤖</div><h3>Classic vs AI</h3><p>Play Classic Ludo against computer opponents.</p></button>
          <button className="lp-mode aero" onClick={()=>{setMode("aero");setMatchType("computer");go("stake")}}><div className="modeicon">🚀</div><h3>Aero vs AI</h3><p>Play Aero Ludo against computer opponents.</p></button>
        </div>
      </>}

      {page==="stake"&&<>
        <div className="lp-backrow"><Back to="mode"/><div><h1>Match entry</h1><div className="lp-muted">{mode==="classic"?"Classic":"Aero"} arena · {matchType==="computer"?"Computer match":"Online match"} · Staking is configured separately</div></div></div>
        <section className="lp-panel">
          <div className="lp-sectionhead"><h2>Choose entry amount</h2><span className="lp-muted">Optional</span></div>
          <div className="lp-stakes" style={{marginTop:16}}>
            {[0,100,250,500].map(v=><button key={v} className={`lp-stake ${stake===v?"selected":""}`} onClick={()=>setStake(v)}>{v===0?"Free":`₦${v}`}</button>)}
          </div>
          <p className="lp-note" style={{marginTop:15}}>Staking is handled before matchmaking and never appears on the gameplay board. Actual balance checks, escrow and settlement must be validated by your backend.</p>
          <div className="lp-actions">{matchType==="computer"
              ?<button className="lp-btn lp-primary" onClick={findComputerMatch} disabled={loading}>{loading?"Preparing match…":"Start computer match →"}</button>
              :<button className="lp-btn lp-primary" onClick={findMatch} disabled={loading}>{loading?"Finding players…":"Find real players →"}</button>}<button className="lp-btn lp-secondary" onClick={()=>go("home")}>Cancel</button></div>
        </section>
      </>}

      {page==="match"&&match&&<>
        <div className="lp-gamehead">
          <div className="lp-backrow"><button className="lp-back" onClick={exitMatch}>←</button><div><div style={{fontWeight:800,fontSize:14}}>Ludo arena</div><div className="lp-muted">{match.mode==="aero"?"Aero":"Classic"} · {matchType==="computer"?"Computer":"Online"} · Match {match.id.slice(0,8)}</div></div></div>
          <div className="lp-topright"><div className="lp-pill">⏱ {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</div><button className="lp-iconbtn" onClick={()=>setSound(!sound)} aria-label="Toggle sound">{sound?"♫":"♩"}</button></div>
        </div>
        <div className="lp-players">{match.players.map(p=><PlayerCard key={p.id} p={p}/>)}</div>
        <Board match={match} currentUserId={me?.id} selectedToken={selectedToken} onSelect={(id,dest)=>{setSelectedToken(id);move(id,dest)}}/>
        <div className="lp-gamebottom">
          <div className="lp-dice">{dice?face[dice]:"⚄"}</div>
          <div className="lp-turn"><strong>{isMyTurn?"Your turn":activePlayer?`${activePlayer.name}'s turn`:"Waiting for turn"}</strong><div>{isMyTurn?"Roll the server dice to continue":"Waiting for the active player"}</div></div>
          <button className="lp-btn lp-primary" onClick={roll} disabled={!isMyTurn||rolling||!backend}>{rolling?"Rolling…":"Roll dice"}</button>
        </div>
        {match.status==="waiting"&&<div className="lp-empty">Waiting for matchmaking to fill the room…</div>}
      </>}

      {page==="match"&&!match&&<><div className="lp-backrow"><Back/><h1>No active match</h1></div><div className="lp-empty">Start a match to enter the arena.</div></>}

      {page==="results"&&<>
        <div className="lp-backrow"><Back/><h1>Match results</h1></div>
        <section className="lp-hero" style={{textAlign:"center"}}><div style={{fontSize:52}}>🏆</div><div className="lp-eyebrow">Match complete</div><h1 className="lp-h1" style={{fontSize:38,marginInline:"auto"}}>{match?.winnerId===me?.id?"VICTORY!":"GAME FINISHED"}</h1><p className="lp-sub" style={{margin:"auto"}}>Final standings are supplied by the match server.</p></section>
        <section className="lp-panel">{(match?.players||[]).slice().sort((a,b)=>(a.rank??99)-(b.rank??99)).map((p,i)=><div className="lp-rankrow" key={p.id}><div className="lp-ranknum">#{p.rank??i+1}</div><div>{p.id===me?.id?"YOU":p.name}</div><strong>{p.score??"—"}</strong></div>)}</section>
        <div className="lp-actions"><button className="lp-btn lp-primary" onClick={startAgain} disabled={!backend?.playAgain}>Play again</button><button className="lp-btn lp-secondary" onClick={exitMatch}>Return to lobby</button></div>
      </>}

      {page==="leaderboard"&&<>
        <div className="lp-backrow"><Back/><div><h1>Leaderboard</h1><div className="lp-muted">Live rankings from your game service</div></div></div>
        <div className="lp-panel"><div className="lp-empty">Connect a leaderboard endpoint to display verified player rankings. No sample or fictional players are shown.</div></div>
      </>}

      {page==="stats"&&<>
        <div className="lp-backrow"><Back/><div><h1>Match statistics</h1><div className="lp-muted">Your verified game history</div></div></div>
        {stats?<div className="lp-statgrid">
          <div className="lp-stat"><span>Matches played</span><strong>{stats.matches}</strong></div><div className="lp-stat"><span>Wins</span><strong>{stats.wins}</strong></div><div className="lp-stat"><span>Win rate</span><strong>{stats.winRate}%</strong></div><div className="lp-stat"><span>Net earnings</span><strong>₦{stats.earnings}</strong></div>
        </div>:<div className="lp-empty">Statistics will appear here when your backend provides your verified match history.</div>}
      </>}

      {page==="settings"&&<>
        <div className="lp-backrow"><Back/><div><h1>Settings</h1><div className="lp-muted">Game preferences</div></div></div>
        <div className="lp-panel"><div className="lp-sectionhead"><div><strong>Sound effects</strong><div className="lp-muted">Game audio preference</div></div><button className="lp-btn lp-secondary" onClick={()=>setSound(!sound)}>{sound?"On ♫":"Off ♩"}</button></div></div>
        <div className="lp-panel"><strong>Account and backend</strong><p className="lp-note">Player identity, balances, matchmaking and match state are provided by your connected application backend. This component does not create placeholder accounts.</p><div className="lp-muted">{me?`Signed in as ${me.name}`:"No authenticated user supplied"}</div></div>
      </>}
    </div>
    <footer className="lp-footer"><span>LUDOPRIME</span><span>REAL PLAYERS · FAIR PLAY</span><span>© {new Date().getFullYear()}</span></footer>
  </div></main>;
}