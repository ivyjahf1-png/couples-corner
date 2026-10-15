"""AAA canvas upgrade part 2: nitro + crash triggers."""
import pathlib
P = pathlib.Path(__file__).resolve().parents[1] / "components" / "game" / "engines" / "RacingEngine.tsx"
g = P.read_text(encoding="utf-8")
o1 = "    audioEngine.playNitroWarpSound();\n"
assert o1 in g
if "boostRef.current = 90" not in g:
    g = g.replace(o1, "    boostRef.current = 90;\n" + o1, 1)
o2 = "            obs.y = canvas.height + 500; // shunt the traffic car off-screen\n"
assert o2 in g
if "shakeRef.current = Math.min" not in g:
    g = g.replace(o2,
        "            shakeRef.current = Math.min(1, shakeRef.current + 0.55);\n"
        "            for (let i = 0; i < 22; i++) {\n"
        "              sparksRef.current.push({ x: pX + (Math.random() - 0.5) * 40, y: playerY + (Math.random() - 0.5) * 50, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 260 - 60, life: 0.6 + Math.random() * 0.4 });\n"
        "            }\n" + o2, 1)
o3 = "            crashedRef.current = true;\n            audioEngine.playCrashImpact();\n"
assert o3 in g
if "shakeRef.current = 1" not in g:
    g = g.replace(o3,
        "            crashedRef.current = true;\n"
        "            shakeRef.current = 1;\n"
        "            for (let i = 0; i < 46; i++) {\n"
        "              sparksRef.current.push({ x: pX + (Math.random() - 0.5) * 50, y: playerY + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 460, vy: -Math.random() * 380 - 80, life: 0.8 + Math.random() * 0.6 });\n"
        "            }\n"
        "            audioEngine.playCrashImpact();\n", 1)
P.write_text(g, encoding="utf-8")
print("triggers ok")
