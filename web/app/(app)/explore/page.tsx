import { redirect } from "next/navigation";

/** Discover moved from /explore to /discover — kept as a permanent redirect. */
export default function ExplorePage() {
  redirect("/discover");
}
