"""Fix useComboBoost tile/jumpTo scope."""
import pathlib
P = pathlib.Path(__file__).resolve().parents[1] / "components" / "game" / "engines" / "LudoEngine.tsx"
s = P.read_text(encoding="utf-8")
old = "setMsg(`4D SKYFLARE CATAPULT! Combo Boost +${roll}! Pawn warped from ${tile} → ${jumpTo}!`);"
new = "setMsg(`4D SKYFLARE CATAPULT! Combo Boost +${roll}! Pawn warped from ${jumpedTile} → ${jumpedTo}!`);"
assert old in s, "old not found"
s = s.replace(old, new)
P.write_text(s, encoding="utf-8")
print("ok")
