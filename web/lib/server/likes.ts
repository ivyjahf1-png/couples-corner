import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { mapProfileRow, profileSelectList } from "@/lib/server/profiles";

/**
 * Likes service (server-side) — reads the profile_likes table created by
 * migration 023. Every query fails soft (returns an empty list) so a missing
 * table or RLS hiccup can never crash the Likes page.
 */

// The generated Database type only knows pre-023 tables; the bot tables
// are queried through the generic client (no structural typing needed),
// so no LooseClient/looseFrom/selectEq/selectAll helpers are required.

export interface LikeView {
  id: string;
  name: string;
  kind: "person" | "couple";
  location: string;
  avatarUrl: string | null;
  isBot: boolean;
  isBlurred: boolean;
  at: string;
}

export interface BotThreadView {
  personaId: string;
  name: string;
  kind: "person" | "couple";
  location: string;
  avatarUrl: string | null;
  preview: string;
  lastMessageAt: string | null;
  unread: number;
}

/** Bot persona threads owned by the viewer (FK-free tables, fail-soft). */
export async function getBotThreadsForUser(userId: string): Promise<BotThreadView[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !userId) return [];
  try {
    const [threadsResult, personasResult] = await Promise.all([
      supabase
        .from("bot_messages")
        .select("persona_id, body, sender, read_at, created_at")
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("bot_personas").select("id, display_name, location, avatar_url"),
    ]);
    if (threadsResult.error) throw threadsResult.error;
    const rows = (threadsResult.data ?? []) as unknown as Array<{
      persona_id: string;
      body: string | null;
      sender: string | null;
      read_at: string | null;
      created_at: string;
    }>;
    const personaRaw = (personasResult as { data?: unknown } | null | undefined)?.data;
    const personaList: Array<Record<string, unknown>> = Array.isArray(personaRaw)
      ? (personaRaw as Array<Record<string, unknown>>)
      : [];
    const personaById = new Map<string, { display_name?: string; location?: string; avatar_url?: string | null }>();
    for (const p of personaList) {
      const pid: unknown = p["id"];
      if (typeof pid === "string" && pid) {
        const dn: unknown = p["display_name"];
        const lc: unknown = p["location"];
        const av: unknown = p["avatar_url"];
        personaById.set(pid, {
          display_name: typeof dn === "string" ? dn : undefined,
          location: typeof lc === "string" ? lc : undefined,
          avatar_url: typeof av === "string" ? av : null,
        });
      }
    }
    const lastByPersona = new Map<string, (typeof rows)[number]>();
    const unreadByPersona = new Map<string, number>();
    for (const r of rows) {
      if (!r?.persona_id) continue;
      if (!lastByPersona.has(r.persona_id)) lastByPersona.set(r.persona_id, r);
      if (r.sender === "bot" && !r.read_at) unreadByPersona.set(r.persona_id, (unreadByPersona.get(r.persona_id) ?? 0) + 1);
    }
    return Array.from(lastByPersona.entries()).map(([personaId, last]) => {
      const persona = personaById.get(personaId);
      return {
        personaId,
        name: persona?.display_name?.trim() || "Community member",
        kind: "person" as const,
        location: persona?.location ?? "",
        avatarUrl: persona?.avatar_url ?? null,
        preview: last?.body ?? "",
        lastMessageAt: last?.created_at ?? null,
        unread: unreadByPersona.get(personaId) ?? 0,
      };
    });
  } catch (error) {
    console.error("[likes] bot threads query failed", supabaseErrorDetail(error as never));
    return [];
  }
}

export function photoStoragePathToUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  const fileName = storagePath.split("/").pop();
  if (!fileName) return null;
  return `/api/photos/${storagePath.split("/")[1] ?? "unknown"}/${fileName}`;
}

/**
 * Everyone who liked the given user, newest first.
 * Blurred placeholder likes are returned too (the page renders them blurred).
 */
export async function getLikesForUser(userId: string): Promise<LikeView[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const [likesResult, profilesResult, personasResult] = await Promise.all([
      supabase
        .from("profile_likes")
        .select("id, liker_id, is_bot, is_blurred, created_at")
        .eq("liked_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("profiles").select(profileSelectList()),
      supabase.from("bot_personas").select("id, display_name, location, avatar_url"),
    ]);

    if (likesResult.error) throw likesResult.error;

    const rows = (likesResult.data ?? []) as unknown as Array<{
      id: string;
      liker_id: string;
      is_bot: boolean;
      is_blurred: boolean;
      created_at: string;
    }>;

    // Resolve liker profiles in one pass (no FK relationship is declared
    // between the new tables and profiles, so we join in code).
    // Bot personas (FK-free table) resolve blurred placeholder likes.
    const byId = new Map<string, Record<string, unknown>>();
    for (const row of (profilesResult.data ?? []) as unknown as Array<Record<string, unknown>>) {
      const profile = mapProfileRow(row);
      if (profile?.userId) byId.set(profile.userId, row);
    }
    const personaRaw2 = (personasResult as { data?: unknown } | null | undefined)?.data;
    const personaRows: Array<Record<string, unknown>> = Array.isArray(personaRaw2)
      ? (personaRaw2 as Array<Record<string, unknown>>)
      : [];
    const personaById = new Map<string, Record<string, unknown>>();
    for (const prow of personaRows) {
      const pid2: unknown = prow["id"];
      if (typeof pid2 === "string" && pid2) personaById.set(pid2, prow);
    }

    return rows
      .map((row) => {
        const likerRow = byId.get(row.liker_id) ?? null;
        const persona = personaById.get(row.liker_id) ?? null;
        const liker: Record<string, unknown> = likerRow ?? {};
        const photosRaw = liker["photos"];
        const photos = Array.isArray(photosRaw) ? photosRaw : [];
        const primary =
          (photos as Array<{ isPrimary?: boolean; storagePath?: string; publicUrl?: string }>).find(
            (p) => p?.isPrimary
          ) ?? (photos as Array<{ storagePath?: string; publicUrl?: string }>)[0];
        const kind =
          liker["profile_type"] === "coupled" ? ("couple" as const) : ("person" as const);
        const likerName = liker["display_name"];
        const likerLoc = liker["location"];
        const personaName = persona?.["display_name"];
        const personaLoc = persona?.["location"];
        const personaAvatarRaw = persona?.["avatar_url"];
        const displayName =
          typeof likerName === "string" && likerName.trim()
            ? likerName
            : typeof personaName === "string" && personaName.trim()
              ? personaName
              : "Someone special";
        const location =
          typeof likerLoc === "string" && likerLoc
            ? likerLoc
            : typeof personaLoc === "string"
              ? personaLoc
              : "";
        const personaAvatar = typeof personaAvatarRaw === "string" ? personaAvatarRaw : null;
        return {
          id: row.id,
          name: displayName,
          kind: kind,
          location,
          avatarUrl: primary?.publicUrl ?? photoStoragePathToUrl(primary?.storagePath ?? null) ?? personaAvatar,
          isBot: Boolean(row.is_bot),
          isBlurred: Boolean(row.is_blurred),
          at: row.created_at,
        };
      })
      .filter((like) => Boolean(like.id));
  } catch (error) {
    // PGRST205 (missing table) or RLS denial → fail soft.
    console.error("[likes] query failed", supabaseErrorDetail(error as never));
    return [];
  }
}
