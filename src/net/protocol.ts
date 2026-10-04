import type { GameAction, GameState } from "@/core/game";

/** Bump on any incompatible change to messages or to the snapshot: mismatched peers are rejected. */
export const PROTOCOL_VERSION = 1;

export interface LobbyPlayer {
  id: string;
  name: string;
  isBot: boolean;
  connected: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  text: string;
  at: number;
}

export interface RoomSettings {
  maxPlayers: number;
}

/** Everything about a room. Every peer holds it, so anyone can take over as host. */
export interface RoomSnapshot {
  code: string;
  epoch: number;
  hostId: string;
  passwordHash: string | null;
  settings: RoomSettings;
  lobby: LobbyPlayer[];
  game: GameState | null;
  chat: ChatMessage[];
}

export type RejectReason = "password" | "full" | "started" | "version" | "kicked";

export type ClientMessage =
  | { t: "hello"; version: number; playerId: string; name: string; passwordHash: string | null }
  | { t: "action"; action: GameAction }
  | { t: "chat"; text: string }
  | { t: "ping" }
  | { t: "leave" };

export type HostMessage =
  | { t: "welcome"; playerId: string; room: RoomSnapshot }
  | { t: "reject"; reason: RejectReason }
  | { t: "snapshot"; room: RoomSnapshot }
  | { t: "error"; error: string }
  | { t: "ping" };
