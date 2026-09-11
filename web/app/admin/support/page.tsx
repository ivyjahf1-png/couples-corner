import { requireAdmin } from "@/lib/auth/authorization";
import { getSupportTicketsAction } from "@/lib/actions/support";
import { PageHeader } from "@/components/app/PageHeader";
import { SupportClient } from "@/components/admin/SupportClient";

export default async function AdminSupportPage() {
  await requireAdmin();
  const tickets = await getSupportTicketsAction();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Support"
        title="Feedback & Support Tickets"
        subtitle="Review user inquiries, respond, and manage ticket statuses."
      />
      <SupportClient initialTickets={tickets} />
    </div>
  );
}