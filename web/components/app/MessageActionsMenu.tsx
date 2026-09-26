"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** How long a press must be held before the menu opens, in ms. */
const LONG_PRESS_MS = 450;
/** Movement beyond this many pixels cancels the press (it became a scroll). */
const MOVE_TOLERANCE_PX = 10;

export interface MessageAction {
  id: "edit" | "delete" | "copy";
  label: string;
  /** `danger` is used for irreversible actions like delete. */
  tone?: "default" | "danger";
}

/** Edit / Delete / Copy, in the order a member expects them. */
export const MESSAGE_ACTIONS: MessageAction[] = [
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete", tone: "danger" },
  { id: "copy", label: "Copy" },
];

/**
 * Long-press (or right-click) context menu for a message bubble.
 *
 * WHY LONG-PRESS AND NOT A VISIBLE BUTTON: a per-bubble "..." control on every
 * message is visual noise at conversation density, and dating-app convention is
 * that actions live behind a deliberate gesture. This fires on a 450ms press,
 * on `contextmenu` (desktop right-click), and on Enter/Space when focused, so
 * the same actions are reachable without a pointer.
 *
 * A press is abandoned if the finger moves more than a few pixels - otherwise
 * scrolling the thread on a phone would open a menu on every bubble passed over.
 * That is the single most common way this interaction gets built wrong.
 *
 * Only the sender's own messages get this menu; the parent passes
 * `actions={[]}` for incoming messages.
 */
export function MessageActionsMenu({
  messageId,
  actions = MESSAGE_ACTIONS,
  onAction,
  disabled = false,
  children,
}: {
  messageId: string;
  actions?: MessageAction[];
  onAction: (action: MessageAction, messageId: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);

  const cancelPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  const openAt = useCallback((clientX: number, clientY: number) => {
    // Anchor the menu near the press point, then clamp it inside the viewport
    // so a press near the right or bottom edge never opens a menu that runs off
    // screen.
    const width = 176;
    const height = 132;
    const left = Math.min(Math.max(8, clientX - width / 2), window.innerWidth - width - 8);
    const top = Math.min(Math.max(8, clientY - height / 2), window.innerHeight - height - 8);
    setPosition({ top, left });
    setOpen(true);
  }, []);

  const beginPress = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled || actions.length === 0) return;
      pressOrigin.current = { x: clientX, y: clientY };
      pressTimer.current = window.setTimeout(() => {
        pressTimer.current = null;
        openAt(clientX, clientY);
      }, LONG_PRESS_MS);
    },
    [disabled, actions.length, openAt]
  );


  // Dismiss on any outside interaction or Escape, matching the ChatHeader
  // options menu so the two menus feel identical.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Never leave a press timer running past unmount.
  useEffect(() => cancelPress, [cancelPress]);

  return (
    <>
      <div
        role="button"
        tabIndex={disabled || actions.length === 0 ? -1 : 0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Message options"
        onContextMenu={(e) => {
          if (disabled || actions.length === 0) return;
          e.preventDefault();
          openAt(e.clientX, e.clientY);
        }}
        onPointerDown={(e) => {
          // Ignore secondary buttons so a right-click does not also arm a timer.
          if (e.button !== 0) return;
          beginPress(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          const origin = pressOrigin.current;
          if (!origin) return;
          const dx = Math.abs(e.clientX - origin.x);
          const dy = Math.abs(e.clientY - origin.y);
          if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          const el = e.currentTarget.getBoundingClientRect();
          openAt(el.left + el.width / 2, el.top + el.height / 2);
        }}
        className="touch-pan-y"
      >
        {children}
      </div>

      {open && position ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Message options"
          style={{ top: position.top, left: position.left }}
          className="fixed z-[200] w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] py-1.5 shadow-2xl shadow-black/60"
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onAction(action, messageId);
              }}
              className={[
                "block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white/10",
                action.tone === "danger" ? "text-red-300" : "text-white",
              ].join(" ")}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}