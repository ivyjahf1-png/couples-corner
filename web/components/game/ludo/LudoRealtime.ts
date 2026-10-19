import { getSupabaseClient } from "@/lib/supabase/client";
import type { LudoGameState } from "@/lib/ludo/engine";

export interface LudoRoomData {
  id: string;
  room_code: string;
  player_ids: (string | null)[];
  game_state: LudoGameState;
  stakes: number;
  status: "waiting" | "active" | "finished";
}

export class LudoRealtimeManager {
  private channel: any = null;
  private roomId: string;
  private userId: string;
  private disconnectTimer: NodeJS.Timeout | null = null;

  constructor(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
  }

  /** Initialize Realtime Channel Subscription */
  public subscribeToRoom(
    onGameStateUpdate: (newState: LudoGameState) => void,
    onPlayerJoin: (players: (string | null)[]) => void,
    onPlayerDisconnect: (userId: string) => void
  ) {
    const supabase = getSupabaseClient();

    this.channel = supabase.channel(ludo_room:${this.roomId}, {
      config: {
        presence: {
          key: this.userId,
        },
      },
    });

    // Listen to broadcast events from other players
    this.channel
      .on("broadcast", { event: "GAME_STATE_CHANGE" }, (payload: { payload: LudoGameState }) => {
        onGameStateUpdate(payload.payload);
      })
      .on("broadcast", { event: "PLAYER_DISCONNECTED" }, (payload: { payload: { userId: string } }) => {
        onPlayerDisconnect(payload.payload.userId);
      })
      // Track presence (online status & reconnection grace)
      .on("presence", { event: "sync" }, () => {
        const presenceState = this.channel.presenceState();
        const activeUserIds = Object.keys(presenceState);
        console.log("Connected players in room:", activeUserIds);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }: { leftPresences: any[] }) => {
        leftPresences.forEach((p) => {
          this.handle45sReconnectionGrace(p.key, onPlayerDisconnect);
        });
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await this.channel.track({
            online_at: new Date().toISOString(),
            userId: this.userId,
          });
        }
      });
  }

  /** 45-Second Reconnection Grace Timer */
  private handle45sReconnectionGrace(
    disconnectedUserId: string,
    onTimeout: (userId: string) => void
  ) {
    console.warn(User ${disconnectedUserId} disconnected. Starting 45s grace period...);

    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);

    this.disconnectTimer = setTimeout(() => {
      console.error(User ${disconnectedUserId} failed to reconnect within 45s.);
      onTimeout(disconnectedUserId);
    }, 45000); // 45 seconds
  }

  /** Broadcast updated Game State (Dice roll / Pawn Move / Turn Shift) */
  public async broadcastGameState(newState: LudoGameState) {
    if (!this.channel) return;

    // 1. Send via WebSocket for instant client UI updates
    await this.channel.send({
      type: "broadcast",
      event: "GAME_STATE_CHANGE",
      payload: newState,
    });

    // 2. Persist to Supabase DB ludo_rooms table
    const supabase = getSupabaseClient();
    await supabase
      .from("ludo_rooms")
      .update({ game_state: newState })
      .eq("id", this.roomId);
  }

  /** Unsubscribe on exit */
  public unsubscribe() {
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    if (this.channel) {
      this.channel.unsubscribe();
    }
  }
}