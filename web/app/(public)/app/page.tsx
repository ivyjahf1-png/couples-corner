import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Get the app — Couple's Corner",
  description: "Install the Couple's Corner Android app and take your corner with you.",
};

/**
 * APK download / install page.
 *
 * THIS ROUTE EXISTS BECAUSE THE LANDING HERO LINKS TO IT. "Get the App" is the
 * only CTA on the guest landing page that is a real navigation rather than a
 * modal, so it has to resolve to something. An earlier pass pointed it at a
 * store listing that does not exist, which is the worst possible failure for a
 * primary CTA: it looks installed and converts nobody.
 *
 * The distribution model is a sideloaded Capacitor APK, not a Play Store
 * listing, so there is no store badge to show and no store URL to link to. That
 * is stated plainly below rather than faked with a dead button — telling a
 * visitor "coming soon" without saying why is how an install funnel dies
 * quietly.
 *
 * When the build pipeline publishes an artifact, the download block below is
 * the single place to wire up.
 */
export default function GetTheAppPage() {
  return (
    <PlaceholderPage title="Get the app">
      <div className="max-w-2xl space-y-6 text-left text-ink-200">
        <p className="text-lg leading-8">
          Couple&apos;s Corner runs on the web today and ships as an Android app
          built with Capacitor, which means it uses the same account and the same
          feed you already have — there is no separate app account to create.
        </p>

        <div className="rounded-2xl border border-ink-700 bg-surface p-6">
          <h2 className="text-lg font-semibold text-foreground">Installing the APK</h2>
          <p className="mt-2 leading-7 text-ink-300">
            The app is distributed as a direct APK rather than through the Play
            Store, so Android will ask you to allow installs from your browser the
            first time. That is expected for a sideloaded build, not a warning
            about anything wrong with the file.
          </p>
          <p className="mt-4 leading-7 text-ink-300">
            The download link is published here once the release build is signed
            and uploaded.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-700 bg-surface p-6">
          <h2 className="text-lg font-semibold text-foreground">Already installed?</h2>
          <p className="mt-2 leading-7 text-ink-300">
            Open the app and it will sign you in from the session already on the
            device — you do not need to log in again. If the app opens to the
            welcome screen, sign in once and it will take you straight to your
            feed from then on.
          </p>
        </div>
      </div>
    </PlaceholderPage>
  );
}