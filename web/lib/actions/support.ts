"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  listSupportTickets,
  updateSupportTicket,
} from "@/lib/server/support";
import type { SupportTicketCategory, SupportTicketStatus } from "@/lib/models";

/** Fetch support tickets, optionally filtered. */
export async function getSupportTicketsAction(options?: {
  status?: SupportTicketStatus;
  category?: SupportTicketCategory;
}) {
  return listSupportTickets(options);
}

/** Update a ticket's status and/or append an admin reply. */
export async function updateSupportTicketAction(
  id: string,
  input: { status?: SupportTicketStatus; adminReply?: string }
): Promise<void> {
  const admin = await requireAdmin();
  await updateSupportTicket(id, input, admin.uid);
  revalidatePath("/admin/support");
}