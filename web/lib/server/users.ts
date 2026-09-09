/**
 * Server-side user provisioning.
 *
 * SECURITY BOUNDARY: `users/{uid}` and `profiles/{uid}` are unwritable by
 * clients (see firestore.rules), so account documents are created here with
 * the Admin SDK after the caller's ID token has been verified. Passwords and
 * any credentials NEVER touch Firestore — Firebase Auth owns credentials.
 */

import type { Firestore } from "firebase-admin/firestore";
import { adminRefs } from "@/lib/firebase/collections";

export interface ProvisionUserInput {
  uid: string;
  email: string;
  displayName?: string;
}

/** Create users/{uid} + profiles/{uid} idempotently (safe to retry). */
export async function provisionUser(
  db: Firestore,
  { uid, email, displayName }: ProvisionUserInput
): Promise<void> {
  const refs = adminRefs(db);
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const userDoc = await tx.get(refs.users.doc(uid));
    if (userDoc.exists) return;

    tx.set(refs.users.doc(uid), {
      email,
      displayName: displayName?.trim() || email.split("@")[0],
      role: "user",
      status: "active",
      emailVerified: false,
      onboardingCompleted: false,
      createdAt: now,
      lastActiveAt: now,
    });

    tx.set(refs.userProfiles.doc(uid), {
      userId: uid,
      displayName: displayName?.trim() || email.split("@")[0],
      bio: null,
      interests: [],
      photos: [],
      visibility: "public",
      discoverable: true,
      lookingFor: null,
      location: null,
      gender: null,
      orientation: null,
      dateOfBirth: null,
      relationshipStatus: null,
      profileType: null,
      preferences: {
        notifyOnConnection: true,
        notifyOnMessages: true,
        showOnlineStatus: true,
      },
      createdAt: now,
      updatedAt: now,
    });
  });
}
