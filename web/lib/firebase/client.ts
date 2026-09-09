/**
 * Couples Corner — Firebase client configuration.
 *
 * The web config values below are public identifiers (Firebase web API keys
 * are not secrets — access control is enforced by Firestore/Storage Security
 * Rules and server-side verification, never by key secrecy). Admin SDK
 * credentials are NEVER imported here; see `lib/firebase/admin.ts`.
 *
 * Initialization is lazy so importing this module never throws at build time
 * when environment variables are absent.
 */

import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when the public web config is present in the environment. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
  );
}

function getClientApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured: missing NEXT_PUBLIC_FIREBASE_* environment variables."
    );
  }
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

/** Lazily-initialized Firebase Authentication (client SDK). */
export function getFirebaseAuth(): Auth {
  return getAuth(getClientApp());
}

/** Lazily-initialized Cloud Firestore (client SDK; limited by Security Rules). */
export function getFirestoreClient(): Firestore {
  return getFirestore(getClientApp());
}

/** Lazily-initialized Cloud Storage (client SDK; limited by Storage Rules). */
export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getClientApp());
}
