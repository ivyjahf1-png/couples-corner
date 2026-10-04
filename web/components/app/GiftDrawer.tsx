"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, Coins, Crown, Sparkles } from "lucide-react";
import { SHEET_BACKDROP, SHEET_PANEL_RELATIVE, SHEET_SHELL } from "@/components/ui/layers";
import { sendGiftAction } from "@/lib/actions/commerce";
import {
  CHEAPEST_GIFT_PRICE,
  GIFTS,
  MAX_GIFT_QUANTITY,
  type GiftItem,
} from "@/lib/giftCatalog";

/**
 * THE GIFT DRAWER — the bottom sheet opened from the Gift button in a chat.
 *
 * ── WHY A BOTTOM SHEET AND NOT A CENTRED MODAL ────────────────────────────────
 * The gift picker is a decision the member makes WHILE reading a conversation, so
 * it has to sit at the bottom and leave the thread above it visible. A centred
 * dialog would cover the messages the gift is being sent into, which is the one
 * piece of context that makes the gesture make sense.
 *
 * ── THE DARK PALETTE, MATCHING THE ROOM ───────────────────────────────────────
 * `#151221` shell over `#1E1932` tiles. These are deliberately NOT the same values
 * as the chat canvas (`#0F0C1B`) or its bubbles (`#1F1A32`): the drawer is a step
 * above both, so a slightly lighter shell reads as "closer to you" without
 * introducing a fourth purple. Text is `#FFFFFF` on every tile, which clears 12:1
 * against `#1E1932`.
 *
 * ── NOTHING HERE IS TRUSTED ───────────────────────────────────────────────────
 * The drawer displays prices but never sends one. `sendGiftAction` takes only a
 * gift id and a quantity and resolves the cost server-side, so the balance shown
 * here is advisory and the debit is authoritative.
 */

/** Sheet shell, one step above the chat canvas. */
const SHELL = "#151221";
/** Tile fill inside the grid. */
const TILE = "#1E1932";
/** The active-tab accent and the Send button. */
const GOLD = "#FFD700";

/** The two tabs. `Privilege` has no screen behind it yet — see the note below. */
type TabId = "gift" | "privilege";

/**
 * PROPS.
 *
 * `coinBalance` is a SNAPSHOT taken when the drawer opens, not a live read. It is
 * deliberately not polled: the authoritative balance lives on the server, and a
 * drawer that quietly changed its own number while open would disagree with the
 * send result it is about to produce. The optimistic debit below is what keeps it
 * feeling live.
 */
interface GiftDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Conversation the gift is sent into. */
  conversationId: string;
  /** Balance at open time. */
  coinBalance: number;
  /** True when a member is signed in; a signed-out visitor cannot send. */
  signedIn: boolean;
}
/** One gift tile. Selected state is a gold border plus a lifted icon. */
function GiftTile({
  gift,
  selected,
  affordable,
  onSelect,
}: {
  gift: GiftItem;
  selected: boolean;
  affordable: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${gift.name}, ${gift.price.toLocaleString()} coins`}
        /* `aspect-square` keeps every tile the same size so the grid stays a grid
           however long the name is. `break-words` on the label below stops a long
           name from widening its track and knocking the row out of alignment. */
        className={[
          "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 p-1.5 transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]",
          selected
            ? "border-[#FFD700] bg-[#FFD700]/10"
            : "border-transparent hover:border-white/20",
        ].join(" ")}
      >
        <span
          aria-hidden
          className={`text-2xl leading-none transition ${selected ? "scale-110" : ""} ${
            affordable ? "" : "opacity-40"
          }`}
        >
          {gift.emoji}
        </span>

        {/* PRICE. `Coins` rather than the 🪙 character: the lucide glyph inherits
            colour and scales cleanly next to the numerals, whereas the emoji
            renders at the platform's chosen size and baseline and breaks
            alignment on iOS. */}
        <span className="flex items-center gap-0.5 text-[11px] font-bold text-white">
          <Coins className="h-3 w-3 shrink-0 text-[#FFD700]" aria-hidden />
          <span className="tabular-nums">{gift.price.toLocaleString()}</span>
        </span>

        <span
          className={`w-full break-words text-center text-[9px] leading-tight ${
            affordable ? "text-[#A09AB0]" : "text-[#A09AB0]/50"
          }`}
        >
          {gift.name}
        </span>
      </button>
    </li>
  );
}

export function GiftDrawer({
  open,
  onClose,
  conversationId,
  coinBalance,
  signedIn,
}: GiftDrawerProps) {
  const [tab, setTab] = useState<TabId>("gift");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [balance, setBalance] = useState(coinBalance);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /* Reset on OPEN, not on mount: the drawer unmounts between uses, so this runs
     once per opening and the member never returns to a half-made selection. The
     default selection is the cheapest gift, which is the one a low balance can
     actually afford — selecting an unaffordable 50,000 gift by default would open
     the drawer already unable to send anything. */
  useEffect(() => {
    if (!open) return;
    setTab("gift");
    setQuantity(1);
    setNotice(null);
    setBalance(coinBalance);
    setSelectedId(
      GIFTS.find((gift) => gift.price <= coinBalance)?.id ?? GIFTS[0]?.id ?? null
    );
  }, [open, coinBalance]);

  const selected = useMemo(
    () => GIFTS.find((gift) => gift.id === selectedId) ?? null,
    [selectedId]
  );

  const total = selected ? selected.price * quantity : 0;
  const canAfford = selected !== null && balance >= total;

  /* Quantity is clamped to what the balance covers, so the +/- pair can never
     produce a total the member cannot pay. Without this, `x99` of a 50,000 gift is
     reachable and every send fails. */
  const maxQuantity = selected
    ? Math.max(1, Math.min(MAX_GIFT_QUANTITY, Math.floor(balance / selected.price)))
    : 1;

  function send() {
    if (!selected || !signedIn || pending) return;
    setNotice(null);
    startTransition(async () => {
      const result = await sendGiftAction({ conversationId, giftId: selected.id, quantity });
      if (!result.ok) {
        /* The server's balance wins on failure: it is the authoritative read, and
           using it stops the drawer from offering a second doomed attempt. */
        if (typeof result.coinBalance === "number") setBalance(result.coinBalance);
        setNotice(result.error ?? "Couldn't send the gift");
        return;
      }
      /* Optimistic debit. The server action already revalidates the path, so this
         only makes the pill move on the same tap instead of after a round trip. */
      setBalance((current) => Math.max(0, current - total));
      onClose();
    });
  }

  if (!open) return null;

  return (
    <div className={SHEET_SHELL} role="dialog" aria-modal="true" aria-label="Send a gift">
      <button type="button" aria-label="Close gift drawer" onClick={onClose} className={SHEET_BACKDROP} />

      {/* BOTTOM SHEET. `max-h-[85dvh]` caps it so the grid scrolls INSIDE the
          sheet instead of the sheet growing past the viewport — `dvh` is what
          makes that cap track the on-screen keyboard. */}
      <div
        className={`${SHEET_PANEL_RELATIVE} flex max-h-[85dvh] w-full flex-col rounded-t-3xl border-t border-white/10`}
        style={{ backgroundColor: SHELL }}
      >
        {/* TABS */}
        <div className="shrink-0 border-b border-white/[0.08] px-4 pt-3">
          <div role="tablist" aria-label="Gift type" className="flex gap-5">
            {(
              [
                { id: "gift", label: "Gift", badge: false },
                { id: "privilege", label: "Privilege", badge: true },
              ] as const
            ).map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={tab === entry.id}
                onClick={() => setTab(entry.id)}
                className={[
                  "relative pb-2.5 text-sm font-bold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]",
                  tab === entry.id ? "text-[#FFD700]" : "text-[#A09AB0] hover:text-white",
                ].join(" ")}
              >
                {entry.label}
                {entry.badge ? (
                  <span
                    aria-label="New privileges available"
                    className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle"
                  />
                ) : null}
                {/* The active indicator. `absolute` against the BUTTON, not the
                    tablist, so it tracks the label width instead of stretching. */}
                {tab === entry.id ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-px mx-auto h-1 w-5 rounded-full bg-[#FFD700]"
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {tab === "gift" ? (
          <>
            {/* THE GRID. `grid-cols-4` is the spec, and every tile is
                `aspect-square` so the tracks stay square at any viewport. The
                scroll lives on THIS element, not the sheet, so the checkout bar
                below stays pinned while the gifts move. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              {notice ? (
                <p role="status" className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                  {notice}
                </p>
              ) : null}

              <ul className="grid grid-cols-4 gap-2">
                {GIFTS.map((gift) => (
                  <GiftTile
                    key={gift.id}
                    gift={gift}
                    selected={gift.id === selectedId}
                    affordable={balance >= gift.price}
                    onSelect={() => setSelectedId(gift.id)}
                  />
                ))}
              </ul>
            </div>

            {/* CHECKOUT BAR. `shrink-0` keeps it pinned at the foot of the sheet
                while the grid scrolls. */}
            <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
              <div className="flex items-center gap-2">
                {/* BALANCE. Not a link and not a button: there is no wallet screen
                    to open from here, so making it look tappable would be a lie.
                    The chevron is decorative and `aria-hidden`. */}
                <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-2 text-sm font-bold text-white">
                  <Coins className="h-4 w-4 shrink-0 text-[#FFD700]" aria-hidden />
                  <span className="truncate tabular-nums">{balance.toLocaleString()}</span>
                  <ChevronDown aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#A09AB0]" />
                </span>

                {/* QUANTITY. A real pair of buttons rather than a native <select>,
                    because a select opens the OS picker over the sheet and covers
                    the gift the member just chose. */}
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-1 py-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || pending}
                    aria-label="Decrease quantity"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:bg-white/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
                  >
                    &minus;
                  </button>
                  <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                    disabled={quantity >= maxQuantity || pending}
                    aria-label="Increase quantity"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:bg-white/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
                  >
                    +
                  </button>
                </span>

                <button
                  type="button"
                  onClick={send}
                  /* Disabled when unaffordable so the member is not invited to fail,
                     and the `title` says why rather than leaving it silent. */
                  disabled={!selected || !signedIn || !canAfford || pending}
                  title={
                    !signedIn
                      ? "Sign in to send a gift"
                      : !canAfford
                        ? `You need ${(total - balance).toLocaleString()} more coins`
                        : `Send ${selected?.name ?? "gift"}`
                  }
                  className="ml-auto h-11 shrink-0 rounded-full px-5 text-sm font-bold text-[#0F0C1B] transition disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{ backgroundColor: GOLD }}
                >
                  {pending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* PRIVILEGE. There is no privilege screen or table in this app, so this
             states that plainly instead of showing a fake list. The red tab badge
             is honest here — there IS something here, it is simply not built. */
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <Crown className="h-8 w-8 text-[#FFD700]" aria-hidden />
            <p className="text-sm font-bold text-white">No privileges yet</p>
            <p className="max-w-xs text-xs leading-5 text-[#A09AB0]">
              Privileges unlock as you keep a conversation going.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}