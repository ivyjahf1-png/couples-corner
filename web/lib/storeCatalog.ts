/**
 * Couples Corner - Store catalog (client-safe).
 *
 * Static source of truth for the store grid. Each category holds up to 50
 * items, generated deterministically so the UI renders a full grid without a
 * round trip. Prices are coin values; durations are days of ownership.
 */

export type StoreCategory =
  | "Frames"
  | "Vehicles"
  | "Room Entry Effects"
  | "Bubbles"
  | "Room Cards"
  | "Themes";

export interface StoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  price: number;
  durationDays: number;
  icon: string;
  gradient: string;
  badge?: "Hot" | "New" | "Featured";
}

export const STORE_CATEGORIES: StoreCategory[] = [
  "Frames",
  "Vehicles",
  "Room Entry Effects",
  "Bubbles",
  "Room Cards",
  "Themes",
];

const FRAME_NAMES = [
  "Golden Halo", "Royal Frame", "Crystal Edge", "Velvet Halo", "Aurora Ring",
  "Emerald Crown", "Sapphire Line", "Obsidian Rim", "Pearl Glow", "Sunset Arc",
  "Midnight Steel", "Rose Quartz", "Amber Cuff", "Mint Braid", "Cobalt Wrap",
];
const VEHICLE_NAMES = [
  "Supercar", "Moon Rover", "City Coupe", "Desert Buggy", "Coast Cruiser",
  "Neon Hatch", "Alpine Wagon", "Night Rider", "Safari Truck", "Turbo Scoot",
  "Orbit Shuttle", "Metro Bike", "Sunset Convertible", "Polar Sled", "Volt Cycle",
];
const ENTRY_NAMES = [
  "Royal Entrance", "Starlight", "Fireworks", "Aurora Gate", "Confetti Path",
  "Velvet Curtain", "Lantern Walk", "Neon Tunnel", "Cascade Veil", "Thunder Roll",
  "Silk Ribbon", "Galaxy Portal", "Rose Petals", "Fire Dance", "Glacier Drop",
];
const BUBBLE_NAMES = [
  "Golden Hearts", "Purple Glow", "Rose Quartz", "Mint Fresh", "Ocean Calm",
  "Amber Warm", "Silver Frost", "Peach Soft", "Lime Pop", "Cobalt Deep",
  "Pearl Sheen", "Blush Dream", "Candy Spark", "Sky Breeze", "Velvet Night",
];
const CARD_NAMES = [
  "Couple Card", "Royal Card", "Classic Card", "Modern Card", "Vintage Card",
  "Gilded Card", "Minimal Card", "Bold Card", "Soft Card", "Night Card",
  "Aurora Card", "Monogram Card", "Heart Card", "Star Card", "Signature Card",
];
const THEME_NAMES = [
  "Midnight Gold", "Royal Purple", "Ocean Deep", "Sunset Ember", "Forest Calm",
  "Arctic Silver", "Rose Quartz", "Emerald Isle", "Cosmic Violet", "Amber Dusk",
  "Steel Blue", "Pearl White", "Onyx Black", "Crimson Silk", "Coral Reef",
];

const GRADIENTS = [
  "from-orange-500 via-amber-400 to-sky-600",
  "from-amber-500 via-orange-600 to-rose-600",
  "from-emerald-500 via-teal-600 to-cyan-700",
  "from-sky-500 via-blue-600 to-violet-700",
  "from-rose-500 via-fuchsia-600 to-indigo-700",
  "from-slate-400 via-slate-600 to-slate-900",
];

const ICONS: Record<StoreCategory, string[]> = {
    "Frames": [
      "🦪",
      "✨",
      "🕒",
      "💍",
      "🌟",
      "👑",
      "💎",
      "\ud83d훡",
      "🕯",
      "🕱",
      "🌙",
      "☀️",
      "❄️",
      "🔥",
      "💫"
    ],
    "Vehicles": [
      "🎎",
      "🚀",
      "🚙",
      "🛵",
      "🚤",
      "🛱",
      "🍫",
      "🚑",
      "🏍",
      "🛶",
      "🚁",
      "🛸",
      "🚜",
      "❄️",
      "⚡"
    ],
    "Room Entry Effects": [
      "✨",
      "🌟",
      "🎆",
      "🌈",
      "🎉",
      "🎭",
      "🍮",
      "💡",
      "💧",
      "⚡",
      "🎀",
      "🌀",
      "🌹",
      "🔥",
      "❄️"
    ],
    "Bubbles": [
      "💛",
      "💜",
      "💗",
      "💚",
      "💙",
      "🟠",
      "🔍",
      "🚧",
      "🧷",
      "💠",
      "🧾",
      "🌸",
      "🍬",
      "☁️",
      "🌜"
    ],
    "Room Cards": [
      "💌",
      "👑",
      "🃇",
      "📂",
      "📜",
      "🃄",
      "🧟",
      "📔",
      "💐",
      "🌃",
      "🌌",
      "🔖",
      "💖",
      "⭐",
      "✏️"
    ],
    "Themes": [
      "🌌",
      "👑",
      "🌊",
      "🔥",
      "🌲",
      "❄️",
      "🌹",
      "💚",
      "🕒",
      "🌆",
      "🌊",
      "\ud83d",
      "⬛️",
      "🎀",
      "🐠"
    ]
  };

function categoryItems(
  category: StoreCategory,
  names: string[],
  basePrice: number,
  priceStep: number
): StoreItem[] {
  const list: StoreItem[] = [];
  // 50 items per category: the curated names first, then numbered variants.
  for (let i = 0; i < 50; i += 1) {
    const name = i < names.length ? names[i] : `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`;
    const icon = ICONS[category][i % ICONS[category].length];
    list.push({
      id: `${category.toLowerCase().replace(/\s+/g, "-")}-${i + 1}`,
      category,
      name,
      price: basePrice + i * priceStep,
      durationDays: i % 3 === 0 ? 7 : 30,
      icon,
      gradient: GRADIENTS[i % GRADIENTS.length],
      badge: i === 0 ? "Featured" : i % 7 === 0 ? "Hot" : i % 5 === 0 ? "New" : undefined,
    });
  }
  return list;
}

export const STORE_ITEMS: StoreItem[] = [
  ...categoryItems("Frames", FRAME_NAMES, 1500, 250),
  ...categoryItems("Vehicles", VEHICLE_NAMES, 6000, 700),
  ...categoryItems("Room Entry Effects", ENTRY_NAMES, 4000, 500),
  ...categoryItems("Bubbles", BUBBLE_NAMES, 800, 120),
  ...categoryItems("Room Cards", CARD_NAMES, 2000, 300),
  ...categoryItems("Themes", THEME_NAMES, 5000, 600),
];

export function itemsForCategory(category: StoreCategory): StoreItem[] {
  return STORE_ITEMS.filter((item) => item.category === category);
}
