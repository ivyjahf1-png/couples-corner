import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Couples Corner — server-side dashboard metrics service.
 * Fetches real-time key metrics for the admin overview dashboard.
 * All queries run through the Supabase server client (bypasses RLS).
 */

export interface DashboardMetrics {
  totalUsers: number;
  newUsersToday: number;
  newCouplesToday: number;
  activeSubscriptions: number;
  revenueToday: number;
  openReports: number;
  openSupportTickets: number;
}

export interface RecentActivity {
  id: string;
  type: "signup" | "report" | "support" | "subscription";
  description: string;
  timestamp: string;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getSupabaseServerClient();
  const empty: DashboardMetrics = {
    totalUsers: 0,
    newUsersToday: 0,
    newCouplesToday: 0,
    activeSubscriptions: 0,
    revenueToday: 0,
    openReports: 0,
    openSupportTickets: 0,
  };
  if (!supabase) return empty;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [{ count: totalUsers }, { count: newUsersToday }, { count: newCouplesToday }, { count: activeSubscriptions }, { count: openReports }, { count: openSupportTickets }] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    supabase.from("couples_profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "premium"),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    newUsersToday: newUsersToday ?? 0,
    newCouplesToday: newCouplesToday ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    revenueToday: 0,
    openReports: openReports ?? 0,
    openSupportTickets: openSupportTickets ?? 0,
  };
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const activities: RecentActivity[] = [];

  const [{ data: recentUsers }, { data: recentReports }, { data: recentTickets }] = await Promise.all([
    supabase.from("users").select("id, email, display_name, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("reports").select("id, reason, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("support_tickets").select("id, subject, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  if (recentUsers) {
    for (const user of recentUsers) {
      activities.push({
        id: `signup-${user.id}`,
        type: "signup",
        description: `${(user.display_name as string) ?? (user.email as string)?.split("@")[0] ?? "A new user"} joined Couples Corner`,
        timestamp: user.created_at as string,
      });
    }
  }

  if (recentReports) {
    for (const report of recentReports) {
      activities.push({
        id: `report-${report.id}`,
        type: "report",
        description: `New report: ${report.reason as string}`,
        timestamp: report.created_at as string,
      });
    }
  }

  if (recentTickets) {
    for (const ticket of recentTickets) {
      activities.push({
        id: `support-${ticket.id}`,
        type: "support",
        description: `Support ticket: ${ticket.subject as string}`,
        timestamp: ticket.created_at as string,
      });
    }
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return activities.slice(0, 10);
}
