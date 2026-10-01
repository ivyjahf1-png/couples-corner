/**
 * Client-side notification helpers.
 *
 * ── WHAT THIS CAN AND CANNOT DO ──────────────────────────────────────────────
 * It can raise a SYSTEM notification when the tab is in the background, via the
 * Web Notifications API, routed through the service worker's `push` handler so
 * there is exactly one place that decides how a notification is presented and
 * which route it opens.
 *
 * It cannot do the thing "high-priority alert" usually implies. A web page does
 * not draw over other apps, and it cannot force a heads-up alert — the OS
 * decides, and a member who has silenced this app has silenced it. If the
 * requirement is a banner that appears over whatever else is on the phone, that
 * is a native-app capability, not a PWA one.
 *
 * Also note: with the tab VISIBLE and focused, no notification is shown at all.
 * That is correct rather than a gap — the member is already looking at the
 * conversation the message arrived in, and a banner over the top of it would be
 * noise. `document.visibilityState` is the check, not a timeout.
 */

export type NotifyPermission = "granted" | "denied" | "default" | "unsupported";

/** Whether this browser exposes the Notifications API at all. */
export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Current permission, or "unsupported" where the API is absent. */
export function notificationPermission(): NotifyPermission {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission as NotifyPermission;
}

/**
 * Ask for permission.
 *
 * MUST be called from a user gesture. Chrome and Safari both reject a
 * `requestPermission()` that does not trace back to a tap, and there is no way to
 * work around that — so this belongs behind a button, never on mount.
 */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (!notificationsSupported()) return "unsupported";
  try {
    return (await Notification.requestPermission()) as NotifyPermission;
  } catch {
    // Older Safari returns a promise-less void and throws on some paths.
    return notificationPermission();
  }
}

interface NotifyOptions {
  title: string;
  body: string;
  /** Route to open on tap. Must be a same-origin path. */
  url: string;
  /**
   * Collapse repeats on the same tag. Use the conversation id so a busy thread
   * replaces its own notification rather than stacking forty of them.
   */
  tag?: string;
  /** Stay on screen until acted on. Use sparingly — it is hard to dismiss. */
  requireInteraction?: boolean;
}

async function serviceWorker(): Promise<ServiceWorker | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.active ?? registration.waiting ?? registration.installing ?? null;
  } catch {
    return null;
  }
}

/**
 * Show a notification for a new message or an incoming call.
 *
 * Prefers the service worker so the `push` handler owns presentation and the tap
 * route — one code path instead of two that drift. Falls back to the page-level
 * `Notification` constructor when no service worker is registered, because a
 * notification that silently does nothing when the SW has not activated yet is
 * worse than a slightly less consistent one.
 */
export async function notifyNewActivity(options: NotifyOptions): Promise<boolean> {
  if (notificationPermission() !== "granted") return false;

  // Already looking at the app. See the header note on why this is correct.
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    return false;
  }

  const payload = {
    type: "PUSH",
    title: options.title,
    body: options.body,
    url: options.url,
    tag: options.tag,
    requireInteraction: options.requireInteraction ?? false,
  };

  const sw = await serviceWorker();
  if (sw) {
    // The MessageChannel is not used deliberately: the worker does not reply, and
    // awaiting a port that never answers would hang the caller forever.
    sw.postMessage(payload);
    return true;
  }

  try {
    new Notification(options.title, {
      body: options.body,
      icon: "/icon.png",
      badge: "/apple-icon.png",
      tag: options.tag,
      requireInteraction: options.requireInteraction ?? false,
      // The page-level constructor has no tap routing, so tapping here falls back
      // to focusing the tab. The service worker path above is the one that can
      // route to the conversation; this is the degraded case, not the intended
      // one.
    });
    return true;
  } catch {
    return false;
  }
}

/** A new message in a conversation. */
export function notifyNewMessage(params: {
  conversationId: string;
  senderName: string;
  preview: string;
}): Promise<boolean> {
  return notifyNewActivity({
    title: params.senderName,
    // Truncated: a notification preview is one or two lines on a phone, and the
    // full message is one tap away. Showing all of it on a lock screen is a
    // privacy decision the member should get to make, not one to make for them.
    body: params.preview.length > 120 ? `${params.preview.slice(0, 120)}…` : params.preview,
    url: `/messages/${params.conversationId}`,
    // Per-conversation, so a busy thread collapses to one notification.
    tag: `message-${params.conversationId}`,
  });
}

/** An incoming call. `requireInteraction` because a ringing call is urgent. */
export function notifyIncomingCall(params: {
  conversationId: string;
  callerName: string;
  mode: "audio" | "video";
}): Promise<boolean> {
  return notifyNewActivity({
    title: `${params.callerName} — incoming ${params.mode} call`,
    body: "Tap to answer",
    url: `/call/${params.conversationId}/${params.mode}`,
    tag: `call-${params.conversationId}`,
    requireInteraction: true,
  });
}
