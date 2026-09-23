/**
 * Couples Corner — Firebase client configuration.
 *
 * Uses a singleton pattern: getFirebaseApp() always returns the same app
 * instance across the entire application. This mirrors lib/supabase/client.ts
 * and prevents initializeApp() from being called multiple times, which would
 * otherwise throw "app/duplicate-app" at runtime.
 *
 * All values are NEXT_PUBLIC_* config identifiers — safe for the browser.
 * Access control is enforced by Firebase Security Rules, never by key secrecy
 * (same principle as the Supabase anon key).
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
// Analytics is browser-only; it is initialized lazily and guarded by
// isSupported() so server-side rendering never touches it.
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const firebaseMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

/**
 * Validate that the required Firebase environment variables are present.
 *
 * @returns An error message if configuration is missing, or null if ready.
 */
export function validateFirebaseConfig(): string | null {
  if (!firebaseApiKey) return "Missing NEXT_PUBLIC_FIREBASE_API_KEY environment variable";
  if (!firebaseAuthDomain) return "Missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN environment variable";
  if (!firebaseProjectId) return "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable";
  if (!firebaseStorageBucket) return "Missing NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable";
  if (!firebaseMessagingSenderId) return "Missing NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID environment variable";
  if (!firebaseAppId) return "Missing NEXT_PUBLIC_FIREBASE_APP_ID environment variable";
  return null;
}

/** True when the Firebase web config is present in the environment. */
export function isFirebaseConfigured(): boolean {
  return validateFirebaseConfig() === null;
}

/** Your web app's Firebase configuration (from the environment). */
export const firebaseConfig = {
  apiKey: firebaseApiKey ?? "",
  authDomain: firebaseAuthDomain ?? "",
  projectId: firebaseProjectId ?? "",
  storageBucket: firebaseStorageBucket ?? "",
  messagingSenderId: firebaseMessagingSenderId ?? "",
  appId: firebaseAppId ?? "",
  ...(firebaseMeasurementId ? { measurementId: firebaseMeasurementId } : {}),
};

/** The shared singleton Firebase app instance. Created once, reused everywhere. */
let singletonApp: FirebaseApp | null = null;

/**
 * Get the shared Firebase app instance (singleton pattern).
 *
 * Returns the existing app when Firebase was already initialized (including
 * from another module via getApps()), initializes it on first call when the
 * environment is configured, and returns null (with a console warning) when
 * env vars are missing so callers can degrade gracefully instead of crashing.
 */
export function getFirebaseApp(): FirebaseApp | null {
  // Return the existing singleton if already initialized here
  if (singletonApp) {
    return singletonApp;
  }

  // Reuse an app initialized elsewhere (e.g. HMR or an SDK default app)
  const existing = getApps();
  if (existing.length > 0) {
    singletonApp = existing[0];
    return singletonApp;
  }

  const configError = validateFirebaseConfig();
  if (configError) {
    console.warn(
      `[Firebase] ${configError}. Returning null to prevent runtime errors. ` +
        "Set the NEXT_PUBLIC_FIREBASE_* variables in your environment."
    );
    return null;
  }

  singletonApp = initializeApp(firebaseConfig);
  return singletonApp;
}

/**
 * Lazily-initialized browser Analytics instance. No-ops (returns null) on the
 * server, in unsupported browsers, or when Firebase is not configured.
 */
export function getFirebaseAnalytics(): Analytics | null {
  const app = getFirebaseApp();
  if (!app || typeof window === "undefined") return null;

  // isSupported() resolves false where Analytics can't run (e.g. blocked
  // storage); catch keeps this safe in sandboxed environments.
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(app);
    })
    .catch(() => {
      // Analytics is optional — never let it break the page.
    });
  return null;
}

export default getFirebaseApp;