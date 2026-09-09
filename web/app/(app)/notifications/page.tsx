import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { NotificationItem } from "@/components/app/NotificationItem";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { demoNotificationViews } from "@/lib/demo/demo-data";

/**
 * Notifications center. Read/unread states, mark-all-read, and per-item
 * navigation to the relevant target. Demo fixtures until Firestore reads land.
 */
export default function NotificationsPage() {
  const unreadCount = demoNotificationViews.filter((n) => n.unread).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
            : "You're all caught up."
        }
        actions={
          <Button size="sm" variant="secondary" disabled={unreadCount === 0}>
            Mark all as read
          </Button>
        }
      />

      {demoNotificationViews.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No notifications yet"
          body="Connection requests, messages, and updates will appear here as they happen."
        />
      ) : (
        <Card padding="none" className="divide-y divide-ink-200">
          {demoNotificationViews.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </Card>
      )}
    </div>
  );
}
