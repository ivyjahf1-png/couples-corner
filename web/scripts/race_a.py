"""AAA canvas upgrade part 1: FX refs."""
import pathlib
P = pathlib.Path(__file__).resolve().parents[1] / "components" / "game" / "engines" / "RacingEngine.tsx"
g = P.read_text(encoding="utf-8")
old = "  const crashedRef = useRef(false);\n"
new = ("  const crashedRef = useRef(false);\n"
 "  const boostRef = useRef(0);\n"
 "  const shakeRef = useRef(0);\n"
 "  const sparksRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);\n"
 "  const starsRef = useRef<Array<{ x: number; y: number; s: number }>>(\n"
 "    Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.42, s: Math.random() * 1.6 + 0.4 })),\n"
 "  );\n"
 "  const smoothXRef = useRef<number | null>(null);\n")
assert old in g and "boostRef" not in g
P.write_text(g.replace(old, new, 1), encoding="utf-8")
print("refs ok")
