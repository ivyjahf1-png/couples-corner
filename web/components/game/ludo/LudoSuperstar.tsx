import React, { useEffect, useRef, useState } from 'react';
import {
  PlayerColor,
  GameMode,
  Pawn,
  TILE_COUNT,
  SAFE_INDICES,
  PLAYERS,
  TRACK,
  HOME_PATHS
} from './ludoConstants';

export const LudoSuperstar: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [balance, setBalance] = useState<number>(5000);
  const [stake, setStake] = useState<number>(100);
  const [mode, setMode] = useState<GameMode>('CLASSIC');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true);

  const [turn, setTurn] = useState<PlayerColor>('RED');
  const [dice, setDice] = useState<number | null>(null);
  const [waitingForMove, setWaitingForMove] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Roll the dice!');

  const [pawns, setPawns] = useState<Record<PlayerColor, Pawn[]>>({
    RED:    [{ id: 0, step: 0 }, { id: 1, step: 0 }, { id: 2, step: 0 }, { id: 3, step: 0 }],
    GREEN:  [{ id: 0, step: 0 }, { id: 1, step: 0 }, { id: 2, step: 0 }, { id: 3, step: 0 }],
    YELLOW: [{ id: 0, step: 0 }, { id: 1, step: 0 }, { id: 2, step: 0 }, { id: 3, step: 0 }],
    BLUE:   [{ id: 0, step: 0 }, { id: 1, step: 0 }, { id: 2, step: 0 }, { id: 3, step: 0 }]
  });

  const playerOrder: PlayerColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

  // Board Drawing
  const renderBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const tile = size / TILE_COUNT;

    ctx.clearRect(0, 0, size, size);

    // Yards
    const drawYard = (gx: number, gy: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(gx * tile, gy * tile, 6 * tile, 6 * tile);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect((gx + 1) * tile, (gy + 1) * tile, 4 * tile, 4 * tile);
    };
    drawYard(0, 0, PLAYERS.RED.color);
    drawYard(9, 0, PLAYERS.GREEN.color);
    drawYard(9, 9, PLAYERS.YELLOW.color);
    drawYard(0, 9, PLAYERS.BLUE.color);

    // Tiles outline
    for (let x = 0; x < 15; x++) {
      for (let y = 0; y < 15; y++) {
        if ((x >= 6 && x <= 8) || (y >= 6 && y <= 8)) {
          ctx.strokeStyle = '#333';
          ctx.strokeRect(x * tile, y * tile, tile, tile);
        }
      }
    }

    // Home paths
    (Object.keys(HOME_PATHS) as PlayerColor[]).forEach((col) => {
      ctx.fillStyle = PLAYERS[col].color;
      HOME_PATHS[col].forEach(([hx, hy]) => ctx.fillRect(hx * tile, hy * tile, tile, tile));
    });

    // Center
    const center = 7.5 * tile;
    const drawTri = (col: string, x1: number, y1: number, x2: number, y2: number) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x1 * tile, y1 * tile);
      ctx.lineTo(center, center);
      ctx.lineTo(x2 * tile, y2 * tile);
      ctx.fill();
    };
    drawTri(PLAYERS.RED.color, 6, 6, 6, 9);
    drawTri(PLAYERS.GREEN.color, 6, 6, 9, 6);
    drawTri(PLAYERS.YELLOW.color, 9, 6, 9, 9);
    drawTri(PLAYERS.BLUE.color, 6, 9, 9, 9);

    // Pawns
    (Object.keys(pawns) as PlayerColor[]).forEach((col) => {
      pawns[col].forEach((pawn, idx) => {
        const { x, y } = getPawnCoords(col, pawn.step, idx, tile);
        ctx.beginPath();
        ctx.arc(x, y, tile * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = PLAYERS[col].color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
  };

  const getPawnCoords = (col: PlayerColor, step: number, idx: number, tile: number) => {
    if (step === 0) {
      const p = PLAYERS[col].yard[idx];
      return { x: (p.x + 0.5) * tile, y: (p.y + 0.5) * tile };
    }
    if (step <= 51) {
      const g = (PLAYERS[col].offset + step - 1) % 52;
      return { x: (TRACK[g][0] + 0.5) * tile, y: (TRACK[g][1] + 0.5) * tile };
    }
    const h = HOME_PATHS[col][Math.min(step - 52, 5)];
    return { x: (h[0] + 0.5) * tile, y: (h[1] + 0.5) * tile };
  };

  useEffect(() => { renderBoard(); }, [pawns, turn]);

  // Dice Roll
  const rollDice = () => {
    if (waitingForMove) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    setDice(roll);

    const canMove = pawns[turn].some((p) => (p.step === 0 ? roll === 6 : p.step + roll <= 57));
  if (!canMove) {
      setStatusMessage("Rolled " + roll + ". No moves!");
      setTimeout(passTurn, 800);
    } else {
      setWaitingForMove(true);
      setStatusMessage("Rolled " + roll + "! Tap your token.");
    }
  };

  // Canvas Click
  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!waitingForMove || !dice || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const tile = canvasRef.current.width / TILE_COUNT;

    pawns[turn].forEach((pawn, idx) => {
      const pt = getPawnCoords(turn, pawn.step, idx, tile);
      if (Math.hypot(pt.x - cx, pt.y - cy) < tile * 0.5) {
        if (pawn.step === 0 && dice !== 6) return;
        if (pawn.step + dice > 57) return;

        const nextStep = pawn.step === 0 ? 1 : pawn.step + dice;
        let bonus = dice === 6;

        const nextPawns = { ...pawns };
        nextPawns[turn] = nextPawns[turn].map((p) => p.id === pawn.id ? { ...p, step: nextStep } : p);

        // Capture check
        if (nextStep >= 1 && nextStep <= 51) {
          const globalIdx = (PLAYERS[turn].offset + nextStep - 1) % 52;
          if (!SAFE_INDICES.includes(globalIdx)) {
            (Object.keys(nextPawns) as PlayerColor[]).forEach((enemy) => {
              if (enemy === turn) return;
              nextPawns[enemy] = nextPawns[enemy].map((ep) => {
                if (ep.step >= 1 && ep.step <= 51 && (PLAYERS[enemy].offset + ep.step - 1) % 52 === globalIdx) {
                  bonus = true;
                  setStatusMessage(Captured ${enemy}! Roll again!);
                  return { ...ep, step: 0 };
                }
                return ep;
              });
            });
          }
        }

        setPawns(nextPawns);
        setWaitingForMove(false);

        // Win check
        const homeCount = nextPawns[turn].filter((p) => p.step === 57).length;
        if (homeCount >= (mode === 'QUICK' ? 1 : 4)) {
       alert("🏆 Player " + turn + " won " + (stake * 4 * 0.9) + " coins!");
          setIsModalOpen(true);
          return;
        }

        if (bonus) setStatusMessage('Bonus turn! Roll again.');
        else passTurn();
      }
    });
  };

  const passTurn = () => {
    setWaitingForMove(false);
    setDice(null);
    const next = playerOrder[(playerOrder.indexOf(turn) + 1) % 4];
    setTurn(next);
    setStatusMessage('Turn: ${next}');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#111', minHeight: '100vh', padding: 16, color: '#fff' }}>
      <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
        <span>🪙 Balance: <b>{balance}</b></span>
        <span>Stake: <b>{stake}</b></span>
      </div>

      <canvas ref={canvasRef} width={420} height={420} onClick={onCanvasClick} style={{ background: '#fff', borderRadius: 8, cursor: waitingForMove ? 'pointer' : 'default' }} />

      <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'center' }}>
        <button onClick={rollDice} disabled={waitingForMove} style={{ width: 60, height: 60, fontSize: 24, cursor: 'pointer', borderRadius: 8 }}>
          {dice ?? '🎲'}
        </button>
        <div>
          <div style={{ color: PLAYERS[turn].color, fontWeight: 'bold' }}>{turn}</div>
          <div style={{ fontSize: 13, color: '#aaa' }}>{statusMessage}</div>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#222', padding: 20, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3>Choose Table</h3>
            <select value={mode} onChange={(e) => setMode(e.target.value as GameMode)}>
              <option value="CLASSIC">Classic (4 Home)</option>
              <option value="QUICK">Quick (1 Home)</option>
            </select>
            <select value={stake} onChange={(e) => setStake(Number(e.target.value))}>
              <option value={100}>100 Coins</option>
              <option value={500}>500 Coins</option>
            </select>
            <button onClick={() => { setBalance(b => b - stake); setIsModalOpen(false); }} style={{ padding: 8, background: '#4CAF50', color: '#fff', border: 'none', cursor: 'pointer' }}>
              PLAY NOW
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LudoSuperstar;