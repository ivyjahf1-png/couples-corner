import json, os

# 100% self-hosted in-app HTML5 games. Every iframeUrl points at a local build
# under public/html5-games/<id>/index.html. NO external GameDistribution iframes.
# Ordered so the Profile "Recommended Games" first-4 = Ludo, Mines, Spin Wheel, Jewels.
games = [
    {"id": "ludo-superstar", "title": "Ludo Classic",   "category": "Board",    "thumbnail": "", "iframeUrl": "/html5-games/ludo/index.html",         "accent": "#E11D48", "emoji": "\U0001F3B2"},
    {"id": "mines",          "title": "Mines",          "category": "Puzzle",   "thumbnail": "", "iframeUrl": "/html5-games/mines/index.html",        "accent": "#2563EB", "emoji": "\U0001F4A3"},
    {"id": "spin-wheel",     "title": "Spin Wheel",     "category": "Arcade",   "thumbnail": "", "iframeUrl": "/html5-games/spin-wheel/index.html",   "accent": "#F59E0B", "emoji": "\U0001F3A1"},
    {"id": "jewels-blitz",   "title": "Jewels Blitz",   "category": "Match-3",  "thumbnail": "", "iframeUrl": "/html5-games/jewels-blitz/index.html", "accent": "#A21CAF", "emoji": "\U0001F48E"},
    {"id": "scratch",        "title": "Scratch Card",   "category": "Arcade",   "thumbnail": "", "iframeUrl": "/html5-games/scratch/index.html",      "accent": "#7C3AED", "emoji": "\U0001F3AB"},
    {"id": "tile-match",     "title": "Tile Match",     "category": "Puzzle",   "thumbnail": "", "iframeUrl": "/html5-games/tile-match/index.html",   "accent": "#0891B2", "emoji": "\U0001F9E9"},
    {"id": "whot",           "title": "Whot! Card Battle", "category": "Cards", "thumbnail": "", "iframeUrl": "/html5-games/whot/index.html",         "accent": "#059669", "emoji": "\U0001F0CF"},
    {"id": "lucky-chest",    "title": "Lucky Chest",    "category": "Arcade",   "thumbnail": "", "iframeUrl": "/html5-games/lucky-chest/index.html",  "accent": "#D97706", "emoji": "\U0001F381"},
]

# Sanity: every referenced build must exist on disk.
missing = [g["id"] for g in games if not os.path.exists(os.path.join("public", g["iframeUrl"].lstrip("/")))]
if missing:
    raise SystemExit("missing local build(s): " + ", ".join(missing))

with open("data/games.json", "w", encoding="utf-8") as f:
    json.dump(games, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("wrote", len(games), "self-hosted games")
print("categories:", sorted({g["category"] for g in games}))
