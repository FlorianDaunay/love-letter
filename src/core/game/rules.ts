import { CARDS, CARD_KINDS, cardValue, type CardKind } from "./cards";
import type { Card, GameState, Knowledge, Player } from "./types";

export const findPlayer = (state: GameState, id: string): Player | undefined =>
  state.players.find((p) => p.id === id);

export const alivePlayers = (state: GameState) => state.players.filter((p) => !p.eliminated);

/** Countess rule: holding her with a King or a Prince forces her out. */
export function mustPlayCountess(hand: Card[]): boolean {
  const kinds = hand.map((c) => c.kind);
  return kinds.includes("countess") && (kinds.includes("king") || kinds.includes("prince"));
}

/** Cards of the hand the player is allowed to play now. */
export function playableCards(state: GameState, playerId: string): Card[] {
  const player = findPlayer(state, playerId);
  if (!player || state.phase !== "turn" || state.current !== playerId) return [];
  if (mustPlayCountess(player.hand)) return player.hand.filter((c) => c.kind === "countess");
  return player.hand;
}

/** Legal targets for a card. Empty for "other" cards means the card is played without effect. */
export function validTargets(state: GameState, playerId: string, kind: CardKind): string[] {
  const mode = CARDS[kind].targets;
  if (mode === "none") return [];
  const others = state.players.filter((p) => p.id !== playerId && !p.eliminated && !p.protected).map((p) => p.id);
  return mode === "any" ? [...others, playerId] : others;
}

/** What `viewerId` knows of `targetId`'s hand, if still valid. */
export function knownCard(state: GameState, viewerId: string, targetId: string): Knowledge | null {
  const known = state.knowledge[viewerId]?.[targetId];
  if (!known) return null;
  const target = findPlayer(state, targetId);
  return target && !target.eliminated && target.hand.some((c) => c.uid === known.uid) ? known : null;
}

/** Cards not visible to `viewerId`: the remaining copies that could be in the deck or other hands. */
export function unseenCounts(state: GameState, viewerId: string): Record<CardKind, number> {
  const counts = Object.fromEntries(CARD_KINDS.map((k) => [k, CARDS[k].count])) as Record<CardKind, number>;
  const seen: Card[] = [...state.faceUp];
  for (const p of state.players) seen.push(...p.discard);
  const me = findPlayer(state, viewerId);
  if (me) seen.push(...me.hand);
  for (const c of seen) counts[c.kind]--;
  return counts;
}

/** Sum used to rank hands at the end of a round. */
export const handValue = (player: Player) => (player.hand[0] ? cardValue(player.hand[0].kind) : -1);
