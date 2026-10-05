"use client";

import { useState } from "react";
import { Delete, X } from "lucide-react";

/**
 * WhatsApp-style emoji drawer for the chat composer.
 *
 * LAYOUT CONTRACT. The drawer is an IN-FLOW child of the composer bar, not a
 * fixed overlay: the chat column is a locked flex column whose middle segment
 * is the only scroll region, so growing the bar shrinks the thread instead of
 * covering it. The bar's own `GLASS_BAR` fill shows through the drawer, which
 * is why the drawer paints no background of its own — stacking a second
 * translucent fill would darken a patch of the bar out of step with the input
 * row directly beneath it.
 *
 * ORDER, top to bottom: toolbar (backspace + close), the scrollable grid for
 * the selected category, then the category tab bar at the BOTTOM of the panel
 * — the spec's stated order, and within thumb reach above the input row.
 *
 * INSERTION IS THE CALLER'S JOB. This component only reports picks (`onPick`)
 * and deletions (`onBackspace`); ChatRoomClient owns the draft and the caret,
 * so insertion lands at the true cursor position and the system keyboard can
 * stay dismissed while the drawer is open.
 *
 * Palette literals mirror ChatRoomClient's module-private THEME/GLASS_BAR,
 * which is not exported because a retint of that screen is meant to stay
 * contained there.
 */

/** Element id the composer's smiley button points at with `aria-controls`. */
export const EMOJI_PICKER_PANEL_ID = "chat-emoji-picker";

/* Palette mirrored from ChatRoomClient's THEME/GLASS_BAR. */
const HAIRLINE = "#3B3554";
const MUTED = "#B8B2D1";
const SOFT = "#C9C2E4";
const ORANGE = "#FF7A00";
/* GLASS_BAR composited over the #0F0C1B canvas — the opaque value the sticky
   category heading needs so grid content cannot show through it while stuck. */
const BAR_OPAQUE = "#19152A";

export interface EmojiCategory {
  /** Stable id — also the DOM id stem for this category's tab/panel pair. */
  id: string;
  /** Full name: the section heading in the grid and the tab's tooltip. */
  label: string;
  /** Representative glyph drawn on the bottom tab. */
  icon: string;
  /** Grid contents. Unique WITHIN a category (they are React keys), not across. */
  emojis: string[];
}

/**
 * The eight standard categories. Each tab's glyph is that list's first emoji.
 * Symbols & Flags merges symbols with flags (the spec names both ❤️ and 🏁);
 * the tab shows one glyph for uniformity and 🏁 opens the same list, so
 * neither half is hidden.
 */
export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys & Emotions",
    icon: "😊",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
      "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌",
      "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛",
      "😝", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩",
      "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁",
      "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭",
      "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶",
      "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭",
      "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯",
      "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮",
      "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿",
      "💀", "☠️", "💩", "🤖", "👻", "🎃", "😺", "😸",
      "😻", "😹", "😽", "🙀", "😿", "🫠", "🫢", "🫣",
    ],
  },
  {
    id: "people",
    label: "People & Body",
    icon: "👋",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏",
      "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉",
      "👆", "👇", "☝️", "👍", "👎", "👊", "🤛", "🤜",
      "👏", "🙌", "👐", "🫱", "🫲", "🤲", "🤝", "🙏",
      "✍️", "💅", "💪", "🦾", "🦿", "🦻", "👁️", "👄",
      "👅", "👂", "👃", "🧠", "🫀", "🫁", "🦴", "🦷",
      "👣", "🤰", "🧑", "👦", "👧", "👨", "👩", "👴",
      "👵", "🧓", "👶", "🧒", "🧔", "👱", "🕺", "💃",
      "🕴️", "🚶", "🏃", "🧘", "🏋️", "🤸", "🏄", "🏊",
      "🤿", "🤺", "🛀", "🛌", "🧖", "🤴", "👸", "🧙",
      "🧚", "🧛", "🧜", "🧝", "🧞", "🧟", "🦸", "🦹",
      "👼", "🕶️", "👓", "🧣", "🧤", "🧢", "👔", "👕",
    ],
  },
  {
    id: "nature",
    label: "Animals & Nature",
    icon: "🐻",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼",
      "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵",
      "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅",
      "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛",
      "🐌", "🐞", "🐜", "🪰", "🪲", "🕷️", "🦂", "🐢",
      "🐍", "🦎", "🐙", "🦑", "🦀", "🐡", "🐠", "🐟",
      "🐬", "🐳", "🦈", "🐊", "🐲", "🐉", "🦕", "🦖",
      "🐾", "🌵", "🌲", "🌳", "🌴", "🌿", "🍀", "🍃",
      "🌾", "🌻", "🌼", "🌸", "🌺", "🌷", "🌹", "🥀",
      "🌈", "⭐", "🌟", "✨", "⚡", "🔥", "❄️", "🌊",
      "💧", "⛈️", "🌦️", "🌧️", "🌨️", "🌪️", "🌫️", "🌋",
      "⛰️", "🏔️", "🕳️", "🐚", "🌱", "🍁", "🍂", "🪴",
    ],
  },
  {
    id: "food",
    label: "Food & Drink",
    icon: "🍎",
    emojis: [
      "🍎", "🍏", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇",
      "🍓", "🫐", "🍈", "🍑", "🍒", "🥝", "🍍", "🥭",
      "🥥", "🥑", "🥦", "🥬", "🥒", "🌽", "🥕", "🧄",
      "🧅", "🥔", "🍠", "🥜", "🌰", "🫘", "🍞", "🥐",
      "🥖", "🥨", "🥯", "🧀", "🥚", "🍳", "🥞", "🧇",
      "🥓", "🍗", "🍖", "🥩", "🍔", "🍟", "🍕", "🌭",
      "🌮", "🌯", "🥙", "🍜", "🍛", "🍚", "🍣", "🍱",
      "🍤", "🥟", "🍢", "🍡", "🍰", "🧁", "🍪", "🍩",
      "🍦", "🍨", "🍧", "🍫", "🍬", "🍭", "🍯", "🥛",
      "☕", "🍵", "🧃", "🥤", "🍺", "🍷", "🥂", "🍸",
      "🧉", "🫖", "🧈", "🍮", "🫙", "🥫", "🍘", "🥮",
    ],
  },
  {
    id: "travel",
    label: "Travel & Places",
    icon: "🚗",
    emojis: [
      "🚗", "🚌", "🚕", "🚙", "🚚", "🚛", "🚜", "🏎️",
      "🏍️", "🛵", "🚲", "🛴", "🛹", "🚑", "🚒", "🚓",
      "🚔", "🚡", "🛤️", "🚉", "🚄", "🚅", "🚇", "🚝",
      "🚞", "🚂", "🚃", "✈️", "🛫", "🛬", "🚁", "🚀",
      "🛸", "🛰️", "🛶", "🚢", "⛵", "🛥️", "🚣", "⚓",
      "🛳️", "🗺️", "🧭", "🗼", "🗽", "🏠", "🏢", "🏥",
      "🏦", "🏨", "🏫", "🏪", "🕌", "⛪", "🕍", "🛕",
      "🏛️", "🏟️", "🏰", "🏯", "🗿", "🏝️", "🏖️", "⛺",
      "🏕️", "🌅", "🌄", "🌆", "🌇", "🌃", "🌉", "🎡",
      "🎢", "🚦", "🛑", "🛣️", "🚧", "🏁", "🪧", "🛝",
    ],
  },
  {
    id: "activities",
    label: "Activities & Events",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🥏",
      "🎳", "🏓", "🏸", "🥍", "🎯", "🪁", "🎣", "🏋️",
      "🤸", "🏌️", "🏄", "🏊", "🤿", "🤺", "⛹️", "🚴",
      "🚵", "🤽", "🤾", "🧗", "⛷️", "🛷", "🛝", "🎿",
      "🎪", "🎭", "🎨", "🖌️", "🖍️", "🎵", "🎶", "🎤",
      "🎧", "🎼", "🎹", "🎻", "🎸", "🥁", "🎷", "🎺",
      "🎙️", "🏆", "🥇", "🥈", "🥉", "🎽", "🎟️", "🎫",
      "🎲", "♟️", "🧩", "🀄", "🎴", "🎏", "🪀", "🎈",
      "🎁", "🎊", "🎉", "🎂", "🍰", "🕯️", "🥳", "🎃",
      "🃏", "🕹️", "🎮", "🎰", "🛼", "🥌", "🏏", "🏂",
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: "💡",
    emojis: [
      "💡", "🔦", "🕯️", "📱", "💻", "⌨️", "🖥️", "🖨️",
      "🖱️", "💽", "💾", "💿", "🎧", "🎚️", "🎛️", "📞",
      "☎️", "📟", "📠", "🔋", "🔌", "🛠️", "🔧", "🔨",
      "⚙️", "🔩", "🔗", "⛓️", "✏️", "🖊️", "📝", "📏",
      "📐", "📎", "📌", "📍", "✂️", "🗃️", "🗄️", "📁",
      "📂", "📇", "📈", "📉", "📊", "📋", "📰", "📃",
      "📅", "📆", "🕰️", "⏰", "⏱️", "⏲️", "⏳", "📷",
      "📸", "📹", "📺", "📻", "🎙️", "🔍", "🔎", "🔭",
      "🔬", "📡", "🚨", "🔔", "🔕", "🚪", "🛏️", "🛋️",
      "🚽", "🚿", "🛁", "🧴", "🧷", "🧺", "🧹", "🗑️",
      "🔑", "🗝️", "🛒", "📦", "🪝", "🪄", "🧸", "🪟",
      "🪞", "🪑", "🪚", "🪜", "🧰", "🧲", "🩺", "🩻",
    ],
  },
  {
    id: "symbols",
    label: "Symbols & Flags",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "✅", "❌", "⛔", "🚫", "⚠️",
      "♻️", "⚛️", "☢️", "☣️", "🔰", "❗", "❓", "💯",
      "🔤", "🔢", "➕", "➖", "✖️", "➗", "♾️", "➰",
      "➿", "🔺", "🔻", "⬆️", "⬇️", "⬅️", "➡️", "🔔",
      "🔕", "♠️", "♣️", "♥️", "♦️", "🀄", "🎴", "🏁",
      "🚩", "🏳️", "🏴", "⚜️", "🔱", "⚖️", "🕉️", "☪️",
      "✡️", "☦️", "☸️", "⛎", "♈", "♉", "♊", "♋",
      "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓",
      "🆕", "🆒", "🆓", "ℹ️", "🅿️", "®️", "©️", "™️",
      "🔞", "🆖", "🆗", "🈚", "🈸", "🈺", "🈷️", "🉐",
    ],
  },
];

/** Shared chrome for the toolbar's icon buttons (mirrors the composer's). */
const iconButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-full text-[#C9C2E4] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]";

export function EmojiPickerDrawer({
  onPick,
  onBackspace,
  onClose,
}: {
  /** Called with the chosen emoji; the parent inserts it at the caret. */
  onPick: (emoji: string) => void;
  /** Called by the drawer's backspace; the parent deletes one grapheme. */
  onBackspace: () => void;
  /** Called by the close button (and anything else that dismisses). */
  onClose: () => void;
}) {
  /* WHICH TAB IS SELECTED. `key={active.id}` on the grid wrapper remounts the
     scroll box on every switch, which resets its scroll position to the top of
     the new category without a ref or a manual scrollTop write. */
  const [activeId, setActiveId] = useState(EMOJI_CATEGORIES[0].id);
  const active =
    EMOJI_CATEGORIES.find((category) => category.id === activeId) ?? EMOJI_CATEGORIES[0];

  return (
    <div
      id={EMOJI_PICKER_PANEL_ID}
      role="group"
      aria-label="Emoji picker"
      className="border-t animate-[cc-emoji-panel-up_0.18s_ease-out] motion-reduce:animate-none"
      style={{ borderColor: HAIRLINE }}
    >
      {/* Toolbar: backspace + close. Both are real buttons so a member can
          delete or dismiss without leaving the drawer. */}
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8B2D1]">Emoji</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onBackspace}
            aria-label="Delete the last character"
            title="Backspace"
            className={iconButtonClass}
          >
            <Delete className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close emoji picker"
            title="Close"
            className={iconButtonClass}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* The dense grid for the selected category. Fixed height + internal
          scroll: the bar stays a known size, so the thread above never jumps
          when a category with more rows is selected. */}
      <div
        key={active.id}
        role="tabpanel"
        id={`${active.id}-emoji-panel`}
        aria-labelledby={`${active.id}-emoji-tab`}
        className="h-48 overflow-y-auto px-2 pb-2 sm:h-56 lg:h-64"
      >
        {/* Sticky heading: content cannot show through it, hence the OPAQUE
            composite of the bar colour rather than the translucent bar fill. */}
        <p
          className="sticky top-0 z-10 px-1 py-1.5 text-[11px] font-semibold text-[#B8B2D1]"
          style={{ backgroundColor: BAR_OPAQUE }}
        >
          {active.label}
        </p>
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 lg:grid-cols-12">
          {active.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onPick(emoji)}
              aria-label={`Insert ${emoji}`}
              className="grid aspect-square place-items-center rounded-lg text-2xl leading-none transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] active:scale-95 motion-reduce:active:scale-100"
            >
              <span aria-hidden>{emoji}</span>
            </button>
          ))}
        </div>
      </div>

      {/* The tab bar sits at the BOTTOM of the panel, directly above the input
          row — the spec's stated order and thumb reach. Eight tabs, one per
          category; the full names ride on `title`/`aria-label` because glyphs
          alone are not announced meaningfully. */}
      <div
        role="tablist"
        aria-label="Emoji categories"
        className="flex border-t"
        style={{ borderColor: HAIRLINE }}
      >
        {EMOJI_CATEGORIES.map((category) => {
          const selected = category.id === active.id;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              id={`${category.id}-emoji-tab`}
              aria-selected={selected}
              aria-controls={`${category.id}-emoji-panel`}
              title={category.label}
              aria-label={category.label}
              onClick={() => setActiveId(category.id)}
              className={[
                "flex flex-1 items-center justify-center py-2 text-lg leading-none transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF7A00]",
                selected ? "bg-white/[0.06]" : "hover:bg-white/5",
              ].join(" ")}
              style={{ color: selected ? ORANGE : SOFT }}
            >
              <span aria-hidden>{category.icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
