import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Couples Corner — server-side dashboard metrics service.
 *
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

  // Total users
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  // New users today
  const { count: newUsersToday } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayISO);

  // New couples today
  const { count: newCouplesToday } = await supabase
    .from("couples_profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayISO);

  // Active subscriptions (users with premium role or active subscription)
  const { count: activeSubscriptions } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "premium");

  // Open reports
  const { count: openReports } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");

  // Open support tickets
  const { count: openSupportTickets } = await supabase
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .in("status", ["open", "in_progress"]);

  return {
    totalUsers: totalUsers ?? 0,
    newUsersToday: newUsersToday ?? 0,
    newCouplesToday: newCouplesToday ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    revenueToday: 0, // Placeholder — integrate with payment provider
    openReports: openReports ?? 0,
    openSupportTickets: openSupportTickets ?? 0,
  };
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const activities: RecentActivity[] = [];

  // Recent signups
  const { data: recentUsers } = await supabase
    .from("users")
    .select("id, email, display_name, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

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

  // Recent reports
  const { data: recentReports } = await supabase
    .from("reports")
    .select("id, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

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

  // Recent support tickets
  const { data: recentTickets } = await supabase
    .from("support_tickets")
    .select("id, subject, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

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

  // Sort by timestamp descending and limit to 10
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return activities.slice(0, 10);
}
