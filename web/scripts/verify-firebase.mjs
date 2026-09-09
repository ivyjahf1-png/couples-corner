/**
 * Firebase initialization smoke test.
 *
 * Usage:  node scripts/verify-firebase.mjs
 *
 * Reads `.env.local`, initializes the Firebase Web app exactly like
 * `lib/firebase/client.ts` does, and confirms Auth/Firestore/Storage services
 * can be obtained. No data is read or written.
 *
 * Server-only Admin credentials are intentionally NOT touched by this script.
 */

import { readFileSync } from "node:fs";
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Minimal .env.local parser (no extra dependency).
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const config = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(config).filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  console.error(`✗ Missing NEXT_PUBLIC_FIREBASE_* variables in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

try {
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  getAuth(app);
  getFirestore(app);
  getStorage(app);
  console.log(`✓ Firebase initialized: project "${config.projectId}" (auth, firestore, storage OK)`);
} catch (error) {
  console.error("✗ Firebase initialization failed:", error.message);
  process.exit(1);
}
