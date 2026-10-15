"""Add jumpedTile/jumpedTo declarations in useComboBoost loop."""
import pathlib
P = pathlib.Path(__file__).resolve().parents[1] / "components" / "game" / "engines" / "LudoEngine.tsx"
s = P.read_text(encoding="utf-8")
old = """      // Arrow warp bonus if it lands on an arrow tile
      let jumped = false;
      for (const [tile, jumpTo] of Object.entries(ARROW_JUMPS)) {"""
new = """      // Arrow warp bonus if it lands on an arrow tile
      let jumped = false;
      let jumpedTile = 0;
      let jumpedTo = 0;
      for (const [tile, jumpTo] of Object.entries(ARROW_JUMPS)) {"""
assert s.count(old) == 1, f"count={s.count(old)}"
s = s.replace(old, new)
P.write_text(s, encoding="utf-8")
print("ok")
