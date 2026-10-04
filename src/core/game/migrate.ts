import { GAME_VERSION, type GameState } from "./types";

/** Brings a game from storage or a file up to the current shape, or returns null if unusable. */
export function normalizeGame(raw: unknown): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<GameState> & { event?: unknown };
  if (!Array.isArray(g.players) || !Array.isArray(g.deck) || typeof g.current !== "string") return null;
  return {
    ...(g as GameState),
    version: GAME_VERSION,
    faceUp: g.faceUp ?? [],
    setAside: g.setAside ?? null,
    knowledge: g.knowledge ?? {},
    lastRound: g.lastRound ?? null,
    winners: g.winners ?? [],
    events: [],
    seq: g.seq ?? 0,
    log: g.log ?? [],
    nextUid: g.nextUid ?? 1000,
    updatedAt: g.updatedAt ?? 0,
  };
}
