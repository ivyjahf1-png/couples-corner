"use client";

import { useState, useEffect } from "react";

export default function LudoSuperstarPage() {
  const [currentScreen, setCurrentScreen] = useState("dashboard");
  const [wager, setWager] = useState(10000000);
  const [playerCount, setPlayerCount] = useState(2);
  const [subMode, setSubMode] = useState("CLASSIC");
  const [isMuted, setIsMuted] = useState(false);
  const [diceValue, setDiceValue] = useState(0);
  const [turn, setTurn] = useState(0);
  const [boardState, setBoardState] = useState({
    currentPlayer: 0,
    diceValue: 0,
    hasRolled: false,
    players: [
      { id: 0, color: "red", tokens: [-1, -1, -1, -1] },
      { id: 1, color: "yellow", tokens: [-1, -1, -1, -1] }
    ]
  });

  return (
    <div className="app-viewport font-game">
      <div className="gold-gradient-text text-center p-4 text-lg gold-border mb-6">
        LUDO SUPERSTAR
      </div>
      {currentScreen === "dashboard" && (
        <div className="p-6">
          <h2 className="text-xl gold-gradient-text mb-4">Join a Ludo Game</h2>
          <div className="space-y-4">
            <div>
              <label className="text-white">Wager</label>
              <p className="text-amber-400 text-lg font-bold">{wager.toLocaleString()} coins</p>
            </div>
            <div>
              <label className="text-white">Players</label>
              <select
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="glossy-btn px-4 py-2 text-white"
              >
                <option value="2">2 Players</option>
                <option value="3">3 Players</option>
                <option value="4">4 Players</option>
              </select>
            </div>
            <div>
              <label className="text-white">Sub-Mode</label>
              <select
                value={subMode}
                onChange={(e) => setSubMode(e.target.value as string)}
                className="glossy-btn px-4 py-2 text-white"
              >
                <option value="CLASSIC">Classic</option>
                <option value="AERO">Aero</option>
                <option value="TALLY">Tally</option>
                <option value="SLAY">Slay</option>
              </select>
            </div>
            <button
              onClick={() => setCurrentScreen("game")}
              className="glossy-btn w-full py-3 text-black font-bold text-amber-600 text-lg"
            >
              Start Game
            </button>
          </div>
        </div>
      )}
      {currentScreen === "game" && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl gold-gradient-text">Ludo Superstar</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-red-500 bg-red-500"></div>
                <span className="text-white">Player 1 (Red)</span>
              </div>
              <div className="w-3 h-3 rounded-yellow-500 bg-yellow-500"></div>
              <span className="text-white">Player 2 (Yellow)</span>
            </div>
          </div>
          <div className="grid grid-cols-15 gap-1">
            {Array.from({ length: 225 }, (_, i) => i).map((idx) => {
              const r = Math.floor(idx / 15);
              const c = idx % 15;
              const cellId = `cell_${r}_${c}`;
              const isStar =
                (r === 2 && c === 6) ||
                (r === 6 && c === 12) ||
                (r === 12 && c === 8) ||
                (r === 8 && c === 2);
              return (
                <div
                  key={idx}
                  id={cellId}
                  className={`ludo-cell ${isStar ? "bg-amber-500/40" : ""} w-full h-full border border-purple-900/20 transition-colors ${boardState.currentPlayer === 0 && !boardState.hasRolled ? "hover:bg-amber-500/50" : ""}`}
                />
              );
            })}
          </div>
          <div className="flex justify-center mb-4">
            <button
              id="diceBtn"
              onClick={() => rollDice()}
              className="glossy-btn px-8 py-3 text-white text-xl font-bold text-amber-600 gold-border"
            >
              <div className="flex items-center space-x-2">
                <i id="diceVisual" className="fa-solid fa-dice-d6 text-3xl"></i>
                <span className="text-amber-400 text-xl">{boardState.diceValue === 0 ? "ROLL" : boardState.diceValue}</span>
              </div>
            </button>
          </div>
          <div className="flex justify-between mb-4">
            <div>
              <span className="text-amber-400 font-bold">Your Turn</span>
              <span id="turnStatusText" className="text-white">YOUR TURN!</span>
            </div>
            <div>
              <span className="text-amber-400 font-bold">Opponent</span>
              <span id="opponentStatus" className="text-white">Waiting...</span>
            </div>
          </div>
          <div id="ludoBoard" className="grid grid-cols-15 gap-1"></div>
        </div>
      )}
      {currentScreen === "victory" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div className="bg-panel rounded-xl p-8 text-center max-w-sm">
            <i className="fa-solid fa-trophy text-gold-500 text-4xl mb-4 glow-active"></i>
            <h2 className="text-2xl gold-gradient-text mb-2">YOU WIN!</h2>
            <p className="text-white mb-6">+20,000,000 coins + 15 XP</p>
            <button
              onClick={() => setCurrentScreen("dashboard")}
              className="glossy-btn px-6 py-2 text-white"
            >
              Play Again
            </button>
            <button
              onClick={() => setCurrentScreen("dashboard")}
              className="glossy-btn px-6 py-2 text-white ml-2"
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    const mainPathGrid = [
      [6,1],[6,2],[6,3],[6,4],[6,5],
      [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
      [0,7],[0,8],
      [1,8],[2,8],[3,8],[4,8],[5,8],
      [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
      [7,14],[8,14],
      [8,13],[8,12],[8,11],[8,10],[8,9],
      [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
      [14,7],[14,6],
      [13,6],[12,6],[11,6],[10,6],[9,6],
      [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
      [7,0],[6,0]
    ];

    function initLudoBoardEngine() {
      const boardElement = document.getElementById('ludoBoard');
      if (!boardElement) return;
      boardState.currentPlayer = 0;
      boardState.diceValue = 0;
      boardState.hasRolled = false;
      boardState.players = [
        { id: 0, color: 'red', tokens: [-1, -1, -1, -1] },
        { id: 1, color: 'yellow', tokens: [-1, -1, -1, -1] }
      ];
      boardElement.innerHTML = '';
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          const cell = document.createElement('div');
          cell.id = `cell_${r}_${c}`;
          cell.className = 'ludo-cell w-full h-full border border-purple-900/20 text-[8px] font-bold';
          if (r < 6 && c < 6) cell.classList.add('bg-emerald-600/30');
          else if (r < 6 && c > 8) cell.classList.add('bg-yellow-500/30');
          else if (r > 8 && c < 6) cell.classList.add('bg-red-600/30');
          else if (r > 8 && c > 8) cell.classList.add('bg-blue-600/30');
          else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cell.classList.add('bg-amber-500/40');
          else cell.classList.add('bg-purple-950/40');
          if ((r===2 && c===6) || (r===6 && c===12) || (r===12 && c===8) || (r===8 && c===2))
            cell.innerHTML = '<i class="fa-solid fa-star text-amber-400 text-[10px]"></i>';
          boardElement.appendChild(cell);
        }
      }
      renderTokensOnBoard();
    }

    function rollDice() {
      if (boardState.hasRolled) return;
      const diceBtn = document.getElementById('diceBtn') as HTMLButtonElement | null;
      if (diceBtn) diceBtn.classList.add('dice-rolling');
      setTimeout(() => {
        diceBtn?.classList.remove('dice-rolling');
        boardState.diceValue = Math.floor(Math.random() * 6) + 1;
        boardState.hasRolled = true;
        const diceIcons = ['fa-dice-one', 'fa-dice-two', 'fa-dice-three', 'fa-dice-four', 'fa-dice-five', 'fa-dice-six'];
        const diceVisual = document.getElementById('diceVisual') as HTMLDivElement | null;
        if (diceVisual) diceVisual.innerHTML = `<i class="fa-solid ${diceIcons[boardState.diceValue - 1]}"></i>`;
        const player = boardState.players[boardState.currentPlayer];
        const canMove = player.tokens.some((pos: number) => (pos === -1 && boardState.diceValue === 6) || pos >= 0);
        if (!canMove) setTimeout(nextTurn, 800);
      }, 400);
    }

    function handleTokenClick(playerId: number, tokenIdx: number) {
      if (!boardState.hasRolled || playerId !== boardState.currentPlayer) return;
      const player = boardState.players[playerId];
      let currentPos = player.tokens[tokenIdx];
      if (currentPos === -1) {
        if (boardState.diceValue === 6) {
          player.tokens[tokenIdx] = playerId === 0 ? 38 : 12;
          playAudio('move');
          renderTokensOnBoard();
          resetDiceAndNext(true);
        }
      } else {
        player.tokens[tokenIdx] = (currentPos + boardState.diceValue) % mainPathGrid.length;
        playAudio('move');
        renderTokensOnBoard();
        if (player.tokens.every((p: number) => p >= 52)) {
          showVictoryScreen();
          return;
        }
        resetDiceAndNext(boardState.diceValue === 6);
      }
    }

    function resetDiceAndNext(extraTurn: boolean) {
      boardState.hasRolled = false;
      if (!extraTurn) {
        boardState.currentPlayer = (boardState.currentPlayer + 1) % 2;
      }
      setTurn(boardState.currentPlayer);
      updateTurnUI();
    }

    function nextTurn() {
      resetDiceAndNext(false);
    }

    function updateTurnUI() {
      const isUser = boardState.currentPlayer === 0;
      const turnIndicatorRing = document.getElementById('turnIndicatorRing') as HTMLDivElement | null;
      if (turnIndicatorRing) {
        turnIndicatorRing.className = isUser
          ? "absolute inset-0 rounded-xl border-2 border-amber-400 animate-ping pointer-events-none"
          : "hidden";
      }
      const turnStatusText = document.getElementById('turnStatusText') as HTMLSpanElement | null;
      if (turnStatusText) {
        turnStatusText.innerText = isUser ? "YOUR TURN!" : "OPPONENT'S TURN";
      }
    }

    function showVictoryScreen() {
      playAudio('victory');
      setCurrentScreen("victory");
      alert("YOU WIN! +20,000,000 coins + 15 XP");
    }

    function aiBotMove() {
      const bot = boardState.players[1];
      let moved = false;
      if (boardState.diceValue === 6) {
        const lockedIdx = bot.tokens.findIndex((p: number) => p === -1);
        if (lockedIdx !== -1) {
          bot.tokens[lockedIdx] = 12;
          moved = true;
        }
      }
      if (!moved) {
        const activeIdx = bot.tokens.findIndex((p: number) => p >= 0);
        if (activeIdx !== -1) {
          bot.tokens[activeIdx] = (bot.tokens[activeIdx] + boardState.diceValue) % mainPathGrid.length;
        }
      }
      playAudio('move');
      renderTokensOnBoard();
      resetDiceAndNext(boardState.diceValue === 6);
    }

    function promptExitGame() {
      if (confirm("Are you sure you want to exit the match? You will lose your wager.")) {
        setCurrentScreen("dashboard");
      }
    }

    function triggerInGameEmoji() {
      playAudio('click');
      alert("Emoji drawer opened!");
    }

    function triggerInGameChat() {
      playAudio('click');
      alert("Quick Chat: 'Good Game!', 'Well Played!', 'Hurry up!'");
    }

    initLudoBoardEngine();
  }, []);
"use client";
import { useState, useEffect } from "react";
const [wager, setWager] = useState(10000000);
  const [playerCount, setPlayerCount] = useState(2);
  const [subMode, setSubMode] = useState("CLASSIC");
  const [isMuted, setIsMuted] = useState(false);
  const [diceValue, setDiceValue] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [turn, setTurn] = useState(0);
  const [board, setBoard] = useState<Array<number[]>>([]);
  const [selectedToken, setSelectedToken] = useState(null);

export default function LudoSuperstarPage() {
  const [currentScreen, setCurrentScreen] = useState("dashboard");
useEffect(() => {
    const twScript = document.createElement("script");
useEffect(() => {
    const style = document.createElement("style");
useEffect(() => {
    let audioCtx: AudioContext | null = null;
useEffect(() => {
    const mainPathGrid = [
function renderTokensOnBoard() {
      document.querySelectorAll('.token-element').forEach((el: Element) => el.remove());
function updateTurnUI() {
      const isUser = boardState.currentPlayer === 0;
      const tr = document.getElementById('turnIndicatorRing') as HTMLDivElement | null;
      if (tr) tr.className = isUser ? "absolute inset-0 rounded-xl border-2 border-amber-400 animate-ping pointer-events-none" : "hidden";
      const tt = document.getElementById('turnStatusText') as HTMLSpanElement | null;
      if (tt) tt.innerText = isUser ? "YOUR TURN!" : "OPPONENT'S TURN";
    }

    function showVictoryScreen() {
      alert("YOU WIN! +20,000,000 coins + 15 XP");
    }

    function aiBotMove() {
      const bot = boardState.players[1];
      let moved = false;
      if (boardState.diceValue === 6) {
        const lockedIdx = bot.tokens.findIndex((p: number) => p === -1);
        if (lockedIdx !== -1) { bot.tokens[lockedIdx] = 12; moved = true; }
      }
      if (!moved) {
        const activeIdx = bot.tokens.findIndex((p: number) => p >= 0);
        if (activeIdx !== -1) { bot.tokens[activeIdx] = (bot.tokens[activeIdx] + boardState.diceValue) % mainPathGrid.length; }
      }
      renderTokensOnBoard();
      resetDiceAndNext(boardState.diceValue === 6);
    }

    function promptExitGame() {
      if (confirm("Are you sure you want to exit the match? You will lose your wager.")) { setCurrentScreen("dashboard"); }
    }

    function triggerInGameEmoji() { alert("Emoji drawer opened!"); }
    function triggerInGameChat() { alert("Quick Chat: 'Good Game!', 'Well Played!', 'Hurry up!'"); }

    initLudoBoardEngine();
  }, []);
      players.forEach((player: any) => {
        player.tokens.forEach((pos: number, idx: number) => {
          const token = document.createElement('div');
          token.className = `token-element w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-black text-[9px] cursor-pointer z-10 transition-all ${player.color === 'red' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'}`;
          token.innerText = idx + 1;
          token.onclick = () => handleTokenClick(player.id, idx);
          if (pos === -1) {
            const yardCell = player.color === 'red' ? document.getElementById(`cell_${10 + (idx > 1 ? 2 : 0)}_${1 + (idx % 2 ? 2 : 0)}`) : document.getElementById(`cell_${1 + (idx > 1 ? 2 : 0)}_${10 + (idx % 2 ? 2 : 0)}`);
            if (yardCell) yardCell.appendChild(token);
          } else if (pos >= 0 && pos < mainPathGrid.length) {
            const gridPos = mainPathGrid[pos];
            const cell = document.getElementById(`cell_${gridPos[0]}_${gridPos[1]}`);
            if (cell) cell.appendChild(token);
          } else {
            const centerCell = document.getElementById('cell_7_7');
            if (centerCell) centerCell.appendChild(token);
          }
        });
      });
    }

    function rollDice() {
      if (boardState.hasRolled) return;
      const diceBtn = document.getElementById('diceBtn') as HTMLButtonElement | null;
      if (diceBtn) diceBtn.classList.add('dice-rolling');
      setTimeout(() => {
        boardState.diceValue = Math.floor(Math.random() * 6) + 1;
        boardState.hasRolled = true;
        const diceIcons = ['fa-dice-one','fa-dice-two','fa-dice-three','fa-dice-four','fa-dice-five','fa-dice-six'];
        const diceVisual = document.getElementById('diceVisual') as HTMLDivElement | null;
        if (diceVisual) diceVisual.innerHTML = `<i class="fa-solid ${diceIcons[boardState.diceValue - 1]}"></i>`;
        const player = boardState.players[boardState.currentPlayer];
        const canMove = player.tokens.some((pos: number) => (pos === -1 && boardState.diceValue === 6) || pos >= 0);
        if (!canMove) setTimeout(nextTurn, 800);
      }, 400);
    }

    function handleTokenClick(playerId: number, tokenIdx: number) {
      if (!boardState.hasRolled || playerId !== boardState.currentPlayer) return;
      const player = boardState.players[playerId];
      let currentPos = player.tokens[tokenIdx];
      if (currentPos === -1) {
        if (boardState.diceValue === 6) {
          player.tokens[tokenIdx] = playerId === 0 ? 38 : 12;
          renderTokensOnBoard();
          resetDiceAndNext(true);
        }
      } else {
        player.tokens[tokenIdx] = (currentPos + boardState.diceValue) % mainPathGrid.length;
        renderTokensOnBoard();
        if (player.tokens.every((p: number) => p >= 52)) { showVictoryScreen(); return; }
        resetDiceAndNext(boardState.diceValue === 6);
      }
    }

    function resetDiceAndNext(extraTurn: boolean) {
      boardState.hasRolled = false;
      if (!extraTurn) { boardState.currentPlayer = (boardState.currentPlayer + 1) % 2; }
      setTurn(boardState.currentPlayer);
      updateTurnUI();
    }

    function nextTurn() { resetDiceAndNext(false); }
      [6,1],[6,2],[6,3],[6,4],[6,5],
      [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
      [0,7],[0,8],
      [1,8],[2,8],[3,8],[4,8],[5,8],
      [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
      [7,14],[8,14],
      [8,13],[8,12],[8,11],[8,10],[8,9],
      [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
      [14,7],[14,6],
      [13,6],[12,6],[11,6],[10,6],[9,6],
      [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
      [7,0],[6,0]
    ];

    function initLudoBoardEngine() {
      const boardElement = document.getElementById('ludoBoard');
      if (!boardElement) return;
      boardElement.innerHTML = '';
      const players = [
        { id: 0, color: 'red', tokens: [-1,-1,-1,-1] },
        { id: 1, color: 'yellow', tokens: [-1,-1,-1,-1] }
      ];
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          const cell = document.createElement('div');
          cell.id = `cell_${r}_${c}`;
          cell.className = 'ludo-cell w-full h-full border border-purple-900/20 text-[8px] font-bold';
          if (r < 6 && c < 6) cell.classList.add('bg-emerald-600/30');
          else if (r < 6 && c > 8) cell.classList.add('bg-yellow-500/30');
          else if (r > 8 && c < 6) cell.classList.add('bg-red-600/30');
          else if (r > 8 && c > 8) cell.classList.add('bg-blue-600/30');
          else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cell.classList.add('bg-amber-500/40');
          else cell.classList.add('bg-purple-950/40');
          if ((r===2 && c===6) || (r===6 && c===12) || (r===12 && c===8) || (r===8 && c===2))
            cell.innerHTML = '<i class="fa-solid fa-star text-amber-400 text-[10px]"></i>';
          boardElement.appendChild(cell);
        }
      }
      renderTokensOnBoard();
    }
    let muted = false;
    function initAudio() { if (!audioCtx) { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } }
    function playAudio(type: string) { if (muted) return; initAudio(); if (!audioCtx) return; const now = audioCtx.currentTime; const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination);
      if (type === 'click') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.05); gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.05); osc.start(now); osc.stop(now + 0.05); }
      else if (type === 'roll') { osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(300, now + 0.15); gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); }
      else if (type === 'move') { osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(659.25, now + 0.05); gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
      else if (type === 'victory') { osc.type = 'square'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(554.37, now + 0.1); osc.frequency.setValueAtTime(659.25, now + 0.2); osc.frequency.setValueAtTime(880, now + 0.3); gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.5); osc.start(now); osc.stop(now + 0.5); }
    }
    function toggleAudio() { muted = !muted; const btn = document.getElementById('audioToggleBtn') as HTMLButtonElement | null; if (btn) btn.innerHTML = muted ? '<i class="fa-solid fa-volume-xmark text-red-400"></i>' : '<i class="fa-solid fa-volume-high text-amber-400"></i>'; }
    window.addEventListener('click', () => initAudio(), { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, []);
    style.textContent = `
      body { background-color: #0b051b; color: #ffffff; font-family: 'Outfit', sans-serif; user-select: none; -webkit-user-select: none; touch-action: manipulation; overflow: hidden; }
      .font-game { font-family: 'Fredoka', sans-serif; }
      .gold-gradient-text { background: linear-gradient(180deg, #FFF099 0%, #F1A80A 50%, #995500 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0px 2px 4px rgba(0,0,0,0.5); }
      .gold-border { border: 2px solid #f1a80a; box-shadow: 0 0 10px rgba(241,168,10,0.4); }
      .glossy-btn { position: relative; overflow: hidden; transition: transform 0.1s ease, box-shadow 0.1s ease; }
      .glossy-btn::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 45%; background: rgba(255,255,255,0.25); border-radius: inherit; pointer-events: none; }
      .glossy-btn:active { transform: scale(0.96); }
      @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 15px rgba(241,168,10,0.6); } 50% { box-shadow: 0 0 25px rgba(241,168,10,0.9); } }
      .glow-active { animation: pulse-glow 2s infinite; }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
      ::-webkit-scrollbar-thumb { background: #f1a80a; border-radius: 4px; }
      .ludo-cell { position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
      .dice-rolling { animation: roll 0.4s ease-in-out infinite alternate; }
      @keyframes roll { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.15); } 100% { transform: rotate(360deg) scale(1); } }
      .app-viewport { width: 100%; height: 100vh; max-width: 480px; margin: 0 auto; position: relative; background: linear-gradient(180deg,#1c0e3d 0%,#0d0620 100%); box-shadow: 0 0 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; overflow: hidden; }
      .token-hop { animation: hop 0.2s ease-in-out; }
      @keyframes hop { 0% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.2); } 100% { transform: translateY(0) scale(1); } }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
    twScript.src = "https://cdn.tailwindcss.com";
    twScript.onload = () => {
      (tailwind as any).config = {
        theme: {
          extend: {
            colors: {
              ludo: {
                bg: "#120a2a",
                panel: "#1e1145",
                accent: "#2f1b67",
                gold: "#ffd700",
                green: "#00e676",
                red: "#ff1744",
                yellow: "#ffea00",
                blue: "#29b6f6",
                purple: "#8e24aa",
              },
            },
            fontFamily: {
              sans: ["Outfit", "sans-serif"],
              game: ["Fredoka", "sans-serif"],
            },
          },
        },
      };
    };
    document.head.appendChild(twScript);
    return () => document.head.removeChild(twScript);
  }, []);