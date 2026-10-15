"""Ludo 4D/5D skyrocket arrows + combo coin recharge."""
import pathlib
P = pathlib.Path(__file__).resolve().parents[1] / "components" / "game" / "engines" / "LudoEngine.tsx"
s = P.read_text(encoding="utf-8")

# 1. Add playSkyrocketWarp to Sensory4DEngine
if "playSkyrocketWarp" not in s and "playSensoryVictory" in s:
    old = "  public playSensoryDefeat() {"
    new = (
        "  public playSkyrocketWarp() {\n"
        "    if (this.isMuted || !this.ctx) return;\n"
        "    const t = this.ctx.currentTime;\n"
        "    try {\n"
        "      const osc = this.ctx.createOscillator();\n"
        "      const gain = this.ctx.createGain();\n"
        "      osc.type = \"sawtooth\";\n"
        "      osc.frequency.setValueAtTime(440, t);\n"
        "      osc.frequency.exponentialRampToValueAtTime(1800, t + 0.12);\n"
        "      gain.gain.setValueAtTime(0.45, t);\n"
        "      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);\n"
        "      osc.connect(gain);\n"
        "      gain.connect(this.ctx.destination);\n"
        "      osc.start(t);\n"
        "      osc.stop(t + 0.2);\n"
        "      const noise = this.ctx.createBufferSource();\n"
        "      const nBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);\n"
        "      const nData = nBuf.getChannelData(0);\n"
        "      for (let i = 0; i < nBuf.length; i++) nData[i] = Math.random() * 2 - 1;\n"
        "      noise.buffer = nBuf;\n"
        "      const nf = this.ctx.createBiquadFilter();\n"
        "      nf.type = \"bandpass\";\n"
        "      nf.frequency.setValueAtTime(2200, t);\n"
        "      nf.Q.setValueAtTime(2, t);\n"
        "      const ng = this.ctx.createGain();\n"
        "      ng.gain.setValueAtTime(0.18, t);\n"
        "      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);\n"
        "      noise.connect(nf);\n"
        "      nf.connect(ng);\n"
        "      ng.connect(this.ctx.destination);\n"
        "      noise.start(t);\n"
        "      noise.stop(t + 0.1);\n"
        "    } catch { /* ignore */ }\n"
        "  }\n\n"
        "  public playSensoryDefeat() {"
    )
    s = s.replace(old, new)

# 2. Add comboCharges state
if "comboCharges" not in s:
    s = s.replace(
        "  const [isRolling, setIsRolling] = useState(false);",
        "  const [comboCharges, setComboCharges] = useState(3); // 3/3\n"
        "  const [comboActive, setComboActive] = useState(false);",
    )

# 3. Add arrow jump mapping
if "arrowJumps" not in s:
    s = s.replace(
        "const sensoryEngine = new Sensory4DEngine();",
        "const sensoryEngine = new Sensory4DEngine();\n\n"
        "// 4D/5D Arrow jump mappings: landing on these tiles cats the pawn forward\n"
        "// and triggers playSkyrocketWarp (4D spatial warp sound).\n"
        "const ARROW_JUMPS: Record<number, number> = {\n"
        "  15: 33, 33: 42,  42: 47,  10: 22,  38: 48,  47: 57,  // arrow tile jumps\n"
        "};",
    )

# 4. Add recharge modal state
if "rechargeModal" not in s:
    s = s.replace(
        "  const [isMuted, setIsMuted] = useState(false);",
        "  const [isMuted, setIsMuted] = useState(false);\n"
        "  const [rechargeModal, setRechargeModal] = useState(false);  // recharge prompt",
    )

P.write_text(s, encoding="utf-8")
print("ludo_wire ok")
