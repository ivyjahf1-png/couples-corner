/**
 * Couples Corner — Supabase Auth error mapping.
 *
 * Map Supabase Auth error codes/messages to clear, non-technical user messages.
 */

export function authErrorMessage(error: unknown): string {
  // Log the full error for debugging — this reveals the real cause in the
  // browser console (e.g., missing credentials, network failures,
  // or unhandled Supabase error codes) instead of hiding it.
  console.error("[Auth error]", error);

  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "";

  const known: Record<string, string> = {
    "User already registered":
      "An account with this email already exists. Try signing in instead.",
    "Invalid login credentials": "Email or password is incorrect.",
    "Email not confirmed":
      "Please verify your email address before signing in. Check your inbox for the verification link.",
    "User not found":
      "No account found with that email. Check the address or create an account.",
    "Password should be at least 6 characters":
      "Please choose a stronger password (at least 8 characters).",
    "Password should be at least 8 characters":
      "Please choose a stronger password (at least 8 characters).",
    "Unable to validate email address": "That email address doesn't look right.",
    "Password reset email sent": "Check your email for a password reset link.",
    "Email rate limit exceeded":
      "Too many attempts — please wait a moment and try again.",
    "Token has expired or is invalid": "This link is invalid or has expired. Request a new one.",
  };

  // Check for known error messages
  for (const [key, value] of Object.entries(known)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Surface the actual error message when it's not a known Supabase code.
  if (message && message !== "Sign-in could not be completed") {
    return message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Something went wrong. Please try again in a moment.";
}
