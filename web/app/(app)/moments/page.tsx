import { redirect } from "next/navigation";

/**
 * `/moments` is a legacy alias for the community feed. Redirecting (instead of
 * rendering a second page) keeps old links and the "Moments" tab working
 * without duplicating feed state or breaking `/feed` deep links.
 */
export default function MomentsPage() {
  redirect("/feed");
}
