import "server-only";

/**
 * Couples Corner — Firebase Admin SDK (SERVER ONLY).
 *
 * SECURITY BOUNDARY
 * -----------------
 * - This module imports `server-only`, so any attempt to reach it from a
 *   Client Component fails the production build.
 * - The service-account credentials (`FIREBASE_ADMIN_*`) are read from
 *   server-only environment variables and must never be prefixed with
 *   `NEXT_PUBLIC_` or logged.
 * - Everything the Admin SDK can do bypasses Security Rules — only trusted,
 *   server-side code paths (session routes, Server Actions, audit logging)
 *   may use it.
 */

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === "couples-corner-admin");
  if (existing) return existing;

  if (process.env.FIREBASE_USE_EMULATORS === "1") {
    // Emulator mode needs no service account — the emulator accepts any auth.
    return (
      getApps().find((app) => app.name === "couples-corner-admin") ??
      initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-couples-corner" }, "couples-corner-admin")
    );
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured: set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY environment variables. Without them, sign-in and registration will fail."
    );
  }

  return initializeApp(
    {
      credential: cert({ clientEmail, privateKey }),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    "couples-corner-admin"
  );
}

/** Admin Authentication — custom claims, session cookies, user management. */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/** Admin Firestore — bypasses Security Rules; trusted server code only. */
export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

/** Admin Cloud Storage — trusted server uploads/deletions (e.g. moderation). */
export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

/** Set the `admin` custom claim. The ONLY sanctioned way to mint admins. */
export async function setAdminClaim(uid: string, isAdmin: boolean): Promise<void> {
  await getAdminAuth().setCustomUserClaims(uid, { admin: isAdmin });
}
