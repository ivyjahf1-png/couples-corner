import { getSupportTicketsAction } from "@/lib/actions/support";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import { PageHeader } from "@/components/app/PageHeader";
import { SupportClient } from "@/components/admin/SupportClient";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import type { SupportTicketRow } from "@/lib/server/support";

export default async function AdminSupportPage() {
  let tickets: SupportTicketRow[] = [];
  try {
    tickets = await getSupportTicketsAction();
  } catch (err) {
    rethrowIfNavigation(err);
    console.error("Failed to load support tickets:", err);
  }

  return (
    <ErrorBoundary feature="Support">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Support"
          title="Feedback & Support Tickets"
          subtitle="Review user inquiries, respond, and manage ticket statuses."
        />
        <SupportClient initialTickets={tickets} />
      </div>
    </ErrorBoundary>
  );
}
