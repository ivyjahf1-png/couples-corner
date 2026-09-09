import Link from "next/link";
import { Icon, type IconName } from "@/components/landing/Icon";
import type { NotificationView } from "@/lib/feature/types";

const kindIcon: Record<NotificationView["kind"], IconName> = {
  connection_request: "couple",
  connection_declined: "couple",
  connection_accepted: "couple",
  message: "chat",
  reaction: "sparkle",
  comment: "chat",
  system: "bell",
};

/**
 * One row in /notifications. Unread rows get the brand wash + "New" dot;
 * the whole row navigates to the notification's target when provided.
 */
export function NotificationItem({ notification }: { notification: NotificationView }) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <Icon name={kindIcon[notification.kind] ?? "bell"} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-800">{notification.text}</p>
        <span className="text-xs text-ink-500">{notification.at}</span>
      </div>
      {notification.unread ? (
        <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
      ) : null}
    </>
  );

  if (notification.href) {
    return (
      <Link
        href={notification.href}
        aria-current={notification.unread ? "true" : undefined}
        className={["flex items-start gap-3 px-5 py-4 transition hover:bg-surface-muted", notification.unread ? "bg-brand-50" : ""].join(" ").trim()}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      aria-current={notification.unread ? "true" : undefined}
      className={["flex items-start gap-3 px-5 py-4", notification.unread ? "bg-brand-50" : ""].join(" ").trim()}
    >
      {content}
    </div>
  );
}
