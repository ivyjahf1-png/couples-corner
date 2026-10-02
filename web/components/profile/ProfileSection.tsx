"use client";

import { useState, type ReactNode } from "react";
import { ProfileIcon, type ProfileIconName } from "@/components/profile/ProfileIcon";

/**
 * A titled profile section with an optional collapse toggle.
 *
 * WHY THIS IS A CLIENT COMPONENT AND WHY IT IS *ONLY* THE TOGGLE: the media
 * section needs to collapse, which needs state. Moving the whole page client-side
 * to get that one behaviour would drag every server-rendered panel across the
 * boundary and lose the guarantee that this screen's data is fetched once on the
 * server. So only the header row is client state, and the children are passed in
 * as already-rendered ReactNode.
 *
 * THE TOGGLE IS A REAL BUTTON WITH `aria-expanded`/`aria-controls`, not a
 * decorative chevron: it is the only control on the screen that hides content, so
 * a screen reader must be able to find it and know whether the region is open.
 */
export function ProfileSection({
  title,
  icon,
  children,
  collapsible = false,
  defaultOpen = true,
  action,
}: {
  title: string;
  /** Leading glyph. Omit for a plain text heading. */
  icon?: ProfileIconName;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Trailing control on the header row (e.g. "Manage all photos"). */
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // The id is derived from the title so it is stable across renders and unique
  // per section on this page, which is what aria-controls needs to be useful.
  const regionId = `profile-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={regionId}
            className="flex min-h-11 items-center gap-2 rounded-lg px-1 text-left text-sm font-semibold text-white transition hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            {icon ? <ProfileIcon name={icon} className="h-4 w-4 shrink-0 text-orange-300" /> : null}
            <span>{title}</span>
            <ProfileIcon
              name="expand"
              className={[
                "h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
        ) : (
          <h2 className="flex min-h-11 items-center gap-2 text-sm font-semibold text-white">
            {icon ? <ProfileIcon name={icon} className="h-4 w-4 shrink-0 text-orange-300" /> : null}
            {title}
          </h2>
        )}
        {action}
      </div>

      {/* `hidden` rather than unmounting, so a collapsed media grid keeps its
          already-loaded <img> elements and does not re-fetch every photo on the
          next expand. Tailwind v4's preflight makes `hidden` win over the flex
          utilities above. */}
      <div id={regionId} hidden={collapsible && !open}>
        {children}
      </div>
    </section>
  );
}