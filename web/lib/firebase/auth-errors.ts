/** Map Firebase Auth error codes to clear, non-technical user messages. */
export function authErrorMessage(error: unknown): string {
  // Log the full error for debugging — this reveals the real cause in the
  // browser console (e.g., missing Admin SDK credentials, network failures,
  // or unhandled Firebase error codes) instead of hiding it.
  console.error("[Auth error]", error);

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  const known: Record<string, string> = {
    "auth/email-already-in-use":
      "An account with this email already exists. Try signing in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/weak-password": "Please choose a stronger password (at least 8 characters).",
    "auth/missing-password": "Please enter your password.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found":
      "No account found with that email. Check the address or create an account.",
    "auth/too-many-requests":
      "Too many attempts — please wait a moment and try again.",
    "auth/network-request-failed":
      "Network problem — check your connection and try again.",
    "auth/invalid-action-code":
      "This link is invalid or has expired. Request a new one.",
    "auth/expired-action-code": "This link has expired. Please request a new one.",
  };

  if (known[code]) return known[code];

  // Surface the actual error message when it's not a known Firebase code.
  // This catches cases like "Sign-in could not be completed" (session exchange
  // failure due to missing Admin SDK config) or network errors.
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message && message !== "Sign-in could not be completed") {
      return message;
    }
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Something went wrong. Please try again in a moment.";
}
