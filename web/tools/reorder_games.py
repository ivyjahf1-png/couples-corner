import json

# Put Scratch Card (Scratch) into the 4th featured slot, before Jewels.
# First 4 featured games become: Ludo, Mines, Spin Wheel, Scratch Card.
FEATURED = ["ludo-superstar", "mines", "spin-wheel", "scratch"]

path = "data/games.json"
with open(path, encoding="utf-8") as f:
    games = json.load(f)

by_id = {g["id"]: g for g in games}
featured = [by_id[i] for i in FEATURED if i in by_id]
rest = [g for g in games if g["id"] not in FEATURED]
ordered = featured + rest

with open(path, "w", encoding="utf-8") as f:
    json.dump(ordered, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("reordered -> first 4:", [g["id"] for g in ordered[:4]])
print("total:", len(ordered))
