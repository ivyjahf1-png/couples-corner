import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/server/audit";
import type {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/lib/models";

/**
 * Couples Corner — server-side support ticket service.
 *
 * Lists and manages user-submitted support inquiries. Writes run through the
 * Supabase server client (bypasses RLS); callers must be verified admins.
 */

const TICKET_STATUSES: SupportTicketStatus[] = ["open", "in_progress", "resolved", "closed"];

export interface SupportTicketRow {
  id: string;
  userId: string;
  email: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminUserId?: string | null;
  adminReply?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** List support tickets, optionally filtered by status or category. */
export async function listSupportTickets(options?: {
  status?: SupportTicketStatus;
  category?: SupportTicketCategory;
}): Promise<SupportTicketRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.category) query = query.eq("category", options.category);

  const { data } = await query;
  if (!data) return [];
  return data.map((t) => ({
    id: t.id as string,
    userId: t.user_id as string,
    email: (t.email as string) ?? "",
    category: t.category as SupportTicketCategory,
    subject: t.subject as string,
    message: t.message as string,
    status: t.status as SupportTicketStatus,
    adminUserId: (t.admin_user_id as string | null) ?? null,
    adminReply: (t.admin_reply as string | null) ?? null,
    createdAt: t.created_at as string,
    updatedAt: t.updated_at as string,
  }));
}

/** Update a ticket's status and/or append an admin reply. Writes an audit entry. */
export async function updateSupportTicket(
  id: string,
  input: { status?: SupportTicketStatus; adminReply?: string },
  adminUid: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");
  if (input.status && !TICKET_STATUSES.includes(input.status)) {
    throw new Error("Invalid ticket status");
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (input.status) {
    updates.status = input.status;
    updates.admin_user_id = adminUid;
    if (input.status === "resolved") updates.resolved_at = now;
  }
  if (typeof input.adminReply === "string") {
    updates.admin_reply = input.adminReply.trim() || null;
    updates.admin_user_id = adminUid;
  }

  await supabase.from("support_tickets").update(updates).eq("id", id);

  await recordAudit({
    adminUserId: adminUid,
    action: `support_ticket.${input.status ?? "reply"}`,
    targetRef: { type: "support_ticket", id },
  });
}