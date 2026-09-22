import { Icon } from "@/components/landing/Icon";
import { MarketingImage } from "@/components/landing/MarketingImage";

export interface OverlapPhoto {
  /** Image URL (admin-uploaded, Supabase Storage). */
  url: string;
  /** Alt text for accessibility. */
  alt: string;
}

/**
 * Overlapping / crossing photo-box layout for the landing page.
 *
 * Photo boxes are layered with rotation and negative offsets so they visually
 * cross each other (as in the reference graphic), while remaining fully
 * responsive — on mobile they collapse into a simple non-overlapping row.
 *
 * Slots are wired to admin-uploaded media: pass the published `homepage`
 * placement items. Any slot without a photo renders a branded dark-navy
 * placeholder box (never white), so the section always looks intentional.
 */
export function OverlappingPhotoShowcase({ photos }: { photos: OverlapPhoto[] }) {
  const slots = Array.from({ length: 3 }, (_, i) => photos[i] ?? null);

  const boxClasses = [
    // Left box — tilted counterclockwise, sits on top of the middle one.
    "relative z-10 w-52 shrink-0 -rotate-6 sm:w-60 lg:w-72",
    // Middle box — larger, behind the two side boxes.
    "relative z-0 w-60 shrink-0 rotate-2 sm:w-72 lg:w-80",
    // Right box — tilted clockwise, overlaps the middle one.
    "relative z-10 w-52 shrink-0 rotate-6 sm:w-60 lg:w-72",
  ];

  const overlapMargins = ["lg:-mr-10", "", "lg:-ml-10"];

  return (
    <div
      className="mx-auto mt-12 flex max-w-6xl flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-center"
      aria-label="Community photo showcase"
    >
      {slots.map((photo, i) => (
        <div
          key={`overlap-slot-${i}`}
          className={[boxClasses[i], overlapMargins[i], "transition duration-300 hover:!rotate-0 hover:z-20 hover:scale-[1.03]"].join(" ")}
        >
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0F172A] shadow-2xl shadow-black/50 ring-1 ring-white/5">
            {photo ? (
              <MarketingImage
                src={photo.url}
                alt={photo.alt}
                tone="story"
                className="h-64 w-full sm:h-72 lg:h-80"
                imgClassName=""
              />
            ) : (
              <div
                className="story-placeholder flex h-64 w-full flex-col items-center justify-center gap-3 sm:h-72 lg:h-80"
                role="img"
                aria-label="Couple's Corner community photo placeholder"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-white">
                  <Icon name="heart" className="h-7 w-7" />
                </div>
                <span className="px-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Your story here
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
