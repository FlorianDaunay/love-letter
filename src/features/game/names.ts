import type { GameState, LogEntry } from "@/core/game";
import type { Translate } from "@/i18n";
import type { RoomSnapshot } from "@/net/protocol";
import { SEAT_COLORS } from "@/ui/palette";

const PLAYER_PARAMS = new Set(["actor", "target", "player"]);
const CARD_PARAMS = new Set(["card", "guess"]);

export function playerName(room: RoomSnapshot, id: string): string {
  return room.game?.players.find((p) => p.id === id)?.name ?? room.lobby.find((p) => p.id === id)?.name ?? "?";
}

export function seatColor(game: GameState | null, id: string): string {
  const index = game?.players.findIndex((p) => p.id === id) ?? -1;
  return SEAT_COLORS[Math.max(0, index) % SEAT_COLORS.length];
}

/** Translates a log entry: player ids become names, card kinds become card names. */
export function formatLog(t: Translate, room: RoomSnapshot, entry: LogEntry): string {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(entry.params)) {
    if (PLAYER_PARAMS.has(key)) params[key] = playerName(room, String(value));
    else if (CARD_PARAMS.has(key)) params[key] = t(`card.${value}`);
    else if (key === "players") params[key] = String(value).split(",").map((id) => playerName(room, id)).join(", ");
    else params[key] = value;
  }
  return t(entry.key, params);
}
