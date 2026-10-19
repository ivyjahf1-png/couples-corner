"use client";
import React, { useEffect, useState, useRef } from "react";
import { LudoBoard } from "./LudoBoard";
import { LudoHud } from "./LudoHud";
import { LudoEmojiBar } from "./LudoEmojiBar";
import { LudoRealtimeManager } from "./LudoRealtime";
import { soundEngine } from "./soundEngine";
import { freshGame, type LudoColor, type LudoGameState } from "@/lib/ludo/engine";

interface LudoRoomProps {
  roomId: string;
  userId: string;
  initialState?: LudoGameState;
}

export function LudoRoom({ roomId, userId, initialState }: LudoRoomProps) {
  const [gameState, setGameState] = useState<LudoGameState>(initialState ?? freshGame());
  const [diceValue, setDiceValue] = useState<number>(1);
  const [rolling, setRolling] = useState<boolean>(false);
  const realtimeRef = useRef<LudoRealtimeManager | null>(null);

  useEffect(() => {
    // 1. Initialize Supabase Realtime channel
    const realtime = new LudoRealtimeManager(roomId, userId);
    realtimeRef.current = realtime;

    realtime.subscribeToRoom(
      (updatedState) => {
        setGameState(updatedState);
        setDiceValue(updatedState.dice);
      },
      (players) => {
        console.log("Updated room players:", players);
      },
      (disconnectedUser) => {
        void disconnectedUser;
        soundEngine.speakCommentary("Player disconnected. Reconnecting...");
      }
    );

    return () => {
      realtime.unsubscribe();
    };
  }, [roomId, userId]);

  /** Handle Roll Dice Action */
  const handleRollDice = async () => {
    if (rolling || gameState.winner !== null) return;

    setRolling(true);
    const rolledValue = Math.floor(Math.random() * 6) + 1;
    setDiceValue(rolledValue);

    soundEngine.announceDiceRoll(rolledValue);

    setTimeout(async () => {
      setRolling(false);

      const nextState: LudoGameState = {
        ...gameState,
        dice: rolledValue,
      };

      setGameState(nextState);

      // Broadcast dice roll to room
      if (realtimeRef.current) {
        await realtimeRef.current.broadcastGameState(nextState);
      }
    }, 600);
  };

  /** Handle Pawn Selection & Move */
  const handleSelectToken = async (tokenIdx: number) => {
    void tokenIdx;
    // Calculate new state after pawn move...
    const nextTurn = ((gameState.turn + 1) % 4) as LudoColor;
    const updatedState: LudoGameState = {
      ...gameState,
      turn: nextTurn,
    };

    setGameState(updatedState);

    // Broadcast move to all room members
    if (realtimeRef.current) {
      await realtimeRef.current.broadcastGameState(updatedState);
    }
  };

  const isMyTurn = (gameState.players[gameState.turn] as { id?: string } | undefined)?.id === userId || gameState.turn === 0;

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto p-2">
      {/* Dynamic Player HUD with Attached Dice */}
      <LudoHud
        state={gameState}
        dice={diceValue}
        rolling={rolling}
        canRollNow={isMyTurn && !rolling}
        onRoll={handleRollDice}
        hubLabel={`Room ${roomId}`}
      />

      {/* 15x15 Ludo Board */}
      <LudoBoard
        state={gameState}
        selectable={[0, 1, 2, 3]}
        onSelect={handleSelectToken}
      />

      {/* Reaction Emoji Toolbar */}
      <LudoEmojiBar />
    </div>
  );
}