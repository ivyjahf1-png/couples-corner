import {
  HOME_COLUMNS,
  PLAYER_COLORS,
  PLAYER_DEEP,
  RING,
  SIZE,
  STARTS,
  YARD_SLOTS,
  tokenCell,
  type GameState,
} from "./ludoCore";

/**
 * Canvas painter for the Ludo Superstar-style board.
 *
 * Pure drawing code — no game rules live here. Renders:
 * - vibrant gradient quadrant bases with white yard panels + slot rings,
 * - a crisp white grid track with coloured, star-marked safe start cells,
 * - gradient home columns feeding a four-wedge pinwheel centre,
 * - detailed "ball" tokens with shading, specular highlights and shadows.
 */

const TAU = Math.PI * 2;

export interface PaintOptions {
  /** Token indices the human may pick right now (glowing hints). */
  pendingMoves: number[];
  /** Toggleable: white stars on the safe start cells. */
  showStars: boolean;
  /** Toggleable: glow ring around movable tokens. */
  showHints: boolean;
}

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb hex colour. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 0xff;
    return Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  };
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(ch(16))}${toHex(ch(8))}${toHex(ch(0))}`;
}

/** Rounded-rect path without relying on ctx.roundRect browser support. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Five-point star centred at (cx, cy). */
function starPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
/** Glossy pawn-style ball: shadow, radial body, rim, specular highlight. */
function drawToken(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  radius: number,
  color: string,
  deep: string,
  movable: boolean,
  showHints: boolean
) {
  ctx.save();
  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(px, py + radius * 0.7, radius * 0.95, radius * 0.36, 0, 0, TAU);
  ctx.fillStyle = "rgba(15, 23, 42, 0.26)";
  ctx.fill();

  // Movable hint halo
  if (movable && showHints) {
    ctx.beginPath();
    ctx.arc(px, py, radius * 1.5, 0, TAU);
    ctx.strokeStyle = "rgba(249, 115, 22, 0.7)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(249, 115, 22, 0.95)";
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 3D body
  const body = ctx.createRadialGradient(
    px - radius * 0.36,
    py - radius * 0.44,
    radius * 0.12,
    px,
    py,
    radius
  );
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.32, shade(color, 0.38));
  body.addColorStop(0.72, color);
  body.addColorStop(1, deep);
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, TAU);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // Specular highlight
  ctx.beginPath();
  ctx.ellipse(px - radius * 0.3, py - radius * 0.4, radius * 0.4, radius * 0.24, -0.6, 0, TAU);
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.fill();
  ctx.restore();
}

/** Paints the full board for the given state onto a 600×600 context. */
export function paintBoard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  options: PaintOptions
): void {
  const { pendingMoves, showStars, showHints } = options;
  const cell = SIZE / 15;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // ── Board base — soft wash so the white track pops ──────────────────
  const base = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  base.addColorStop(0, "#f8fafc");
  base.addColorStop(1, "#e6edf7");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ── Player quadrants: vibrant gradient + white yard panel + rings ───
  const yardOrigin: Array<[number, number]> = [[0, 0], [9, 0], [9, 9], [0, 9]];
  yardOrigin.forEach(([qx, qy], p) => {
    const color = PLAYER_COLORS[p];
    const deep = PLAYER_DEEP[p];

    const quadrant = ctx.createLinearGradient(
      qx * cell,
      qy * cell,
      (qx + 6) * cell,
      (qy + 6) * cell
    );
    quadrant.addColorStop(0, shade(color, 0.55));
    quadrant.addColorStop(1, shade(color, 0.08));
    roundRect(ctx, qx * cell + 2, qy * cell + 2, cell * 6 - 4, cell * 6 - 4, cell * 0.55);
    ctx.fillStyle = quadrant;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = deep;
    ctx.stroke();

    // Inner white yard panel
    const panelX = (qx + 1.15) * cell;
    const panelY = (qy + 1.15) * cell;
    const panelW = 3.7 * cell;
    roundRect(ctx, panelX, panelY, panelW, panelW, cell * 0.5);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = shade(color, 0.25);
    ctx.stroke();

    // Slot rings the tokens rest in
    YARD_SLOTS[p].forEach(([sx, sy]) => {
      const cx = (sx + 0.5) * cell;
      const cy = (sy + 0.5) * cell;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.4, 0, TAU);
      ctx.fillStyle = shade(color, 0.74);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = shade(color, 0.1);
      ctx.stroke();
    });
  });

  // ── Main track: crisp white cells; coloured+starred safe starts ─────
  RING.forEach(([x, y], i) => {
    const startOwner = STARTS.indexOf(i);
    if (startOwner !== -1) {
      const color = PLAYER_COLORS[startOwner];
      const g = ctx.createLinearGradient(
        x * cell,
        y * cell,
        (x + 1) * cell,
        (y + 1) * cell
      );
      g.addColorStop(0, shade(color, 0.3));
      g.addColorStop(1, color);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = "#ffffff";
    }
    ctx.fillRect(x * cell, y * cell, cell, cell);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#94a3b8";
    ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);

    if (startOwner !== -1 && showStars) {
      starPath(ctx, (x + 0.5) * cell, (y + 0.5) * cell, cell * 0.33, cell * 0.145);
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = shade(PLAYER_COLORS[startOwner], -0.25);
      ctx.stroke();
    }
  });
  // ── Home columns: vibrant gradients deepening toward the centre ─────
  HOME_COLUMNS.forEach((column, p) => {
    const color = PLAYER_COLORS[p];
    column.forEach(([x, y], step) => {
      const t = step / (column.length - 1);
      ctx.fillStyle = shade(color, 0.5 - t * 0.42);
      ctx.fillRect(x * cell, y * cell, cell, cell);
      ctx.lineWidth = 1;
      ctx.strokeStyle = shade(color, -0.15);
      ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
    });
  });

  // ── Centre: four-wedge pinwheel + gold star "home" badge ────────────
  const mid = 7.5 * cell;
  const wedges: Array<{ corners: Array<[number, number]>; player: number }> = [
    { corners: [[6 * cell, 6 * cell], [6 * cell, 9 * cell], [mid, mid]], player: 0 }, // left · red
    { corners: [[6 * cell, 6 * cell], [9 * cell, 6 * cell], [mid, mid]], player: 1 }, // top · green
    { corners: [[9 * cell, 6 * cell], [9 * cell, 9 * cell], [mid, mid]], player: 2 }, // right · yellow
    { corners: [[6 * cell, 9 * cell], [9 * cell, 9 * cell], [mid, mid]], player: 3 }, // bottom · blue
  ];
  wedges.forEach(({ corners, player }) => {
    const color = PLAYER_COLORS[player];
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);
    ctx.lineTo(corners[1][0], corners[1][1]);
    ctx.lineTo(corners[2][0], corners[2][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = shade(color, -0.25);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.arc(mid, mid, cell * 0.62, 0, TAU);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#f59e0b";
  ctx.stroke();
  starPath(ctx, mid, mid, cell * 0.4, cell * 0.17);
  ctx.fillStyle = "#f59e0b";
  ctx.fill();

  // ── Tokens (stack offset so shared squares stay visible) ────────────
  for (let p = 0; p < 4; p += 1) {
    for (let t = 0; t < 4; t += 1) {
      const pos = state.tokens[p][t];
      let x: number;
      let y: number;
      if (pos === -1) {
        const slot = YARD_SLOTS[p][t];
        [x, y] = slot;
      } else {
        [x, y] = tokenCell(p, pos);
      }
      let shared = 0;
      for (let q = 0; q < 4; q += 1) {
        if (q === p) continue;
        for (let u = 0; u < 4; u += 1) {
          const other = state.tokens[q][u];
          if (other === -1) continue;
          const [ox, oy] = tokenCell(q, other);
          if (ox === x && oy === y) shared += 1;
        }
      }
      const px = (x + 0.5) * cell + (shared ? cell * 0.14 : 0);
      const py = (y + 0.5) * cell - (shared ? cell * 0.14 : 0);
      const movable = p === 0 && pendingMoves.includes(t);
      drawToken(
        ctx,
        px,
        py,
        pos === -1 ? cell * 0.3 : cell * 0.33,
        PLAYER_COLORS[p],
        PLAYER_DEEP[p],
        movable,
        showHints
      );
    }
  }
}


