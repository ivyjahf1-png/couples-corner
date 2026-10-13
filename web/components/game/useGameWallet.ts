"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function useGameWallet() {
  const [balance, setBalance] = useState(10000);
  const [level, setLevel] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabaseClient();
    sb.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      sb.from("game_wallets").select("coin_balance,game_level").eq("user_id", uid).maybeSingle().then(({ data: w }) => {
        const row = w as { coin_balance?: number; game_level?: number } | null;
        if (row && typeof row.coin_balance === "number") setBalance(row.coin_balance);
        if (row && typeof row.game_level === "number") setLevel(Math.max(1, row.game_level));
      });
    });
  }, []);

  const applyDelta = useCallback(async (delta: number) => {
    let next = 0;
    setBalance((b) => {
      next = Math.max(0, b + delta);
      return next;
    });
    if (!userId || !isSupabaseConfigured()) return;
    const sb = getSupabaseClient();
    await sb.from("game_wallets").upsert({ user_id: userId, coin_balance: next }, { onConflict: "user_id" });
  }, [userId]);

  return { balance, level, applyDelta };
}
