import { Rng } from "../rng";
import { GUARD_GUESSES, cardValue, type CardKind } from "./cards";
import { findPlayer, knownCard, playableCards, unseenCounts, validTargets } from "./rules";
import type { Card, GameAction, GameState } from "./types";

/**
 * A reasonable opponent: uses only what its seat may know (its hand, public discards,
 * what Priest/Baron/King revealed to it). Returns null when it has nothing to do.
 */
export function chooseBotAction(state: GameState, botId: string, seed: number): GameAction | null {
  const rng = new Rng(seed);
  const me = findPlayer(state, botId);
  if (!me || me.eliminated || state.current !== botId) return null;

  if (state.phase === "chancellor") {
    // Keep the strongest card, bury the rest (weakest deepest).
    const sorted = [...me.hand].sort((a, b) => cardValue(b.kind) - cardValue(a.kind));
    return { type: "chancellorReturn", uids: sorted.slice(1).reverse().map((c) => c.uid) };
  }
  if (state.phase !== "turn") return null;

  const unseen = unseenCounts(state, botId);
  const pool = Object.values(unseen).reduce((a, b) => a + b, 0) || 1;
  const leaderFirst = (ids: string[]) =>
    [...ids].sort((a, b) => (findPlayer(state, b)!.tokens - findPlayer(state, a)!.tokens) || rng.next() - 0.5);

  let best: { score: number; action: GameAction } | null = null;
  for (const card of playableCards(state, botId)) {
    const other = me.hand.find((c) => c.uid !== card.uid) as Card | undefined;
    const keep = other ? cardValue(other.kind) : 0;
    const option = evaluate(card, other?.kind);
    const score = option.score + keep * 1.5 + rng.next() * 4;
    if (!best || score > best.score) best = { score, action: option.action };
  }
  return best?.action ?? null;

  function evaluate(card: Card, other: CardKind | undefined): { score: number; action: GameAction } {
    const targets = validTargets(state, botId, card.kind);
    const base = { type: "play" as const, uid: card.uid };
    const known = (id: string) => knownCard(state, botId, id)?.kind;
    const others = targets.filter((t) => t !== botId);

    switch (card.kind) {
      case "guard": {
        if (others.length === 0) return { score: 0, action: base };
        const sure = others.find((t) => known(t) && known(t) !== "guard");
        if (sure) return { score: 100, action: { ...base, target: sure, guess: known(sure) } };
        const guess = GUARD_GUESSES.reduce((a, b) => (unseen[b] > unseen[a] ? b : a));
        return { score: 18 + (unseen[guess] / pool) * 40, action: { ...base, target: leaderFirst(others)[0], guess } };
      }
      case "baron": {
        if (others.length === 0 || other === undefined) return { score: 0, action: base };
        const mine = cardValue(other);
        for (const t of others) {
          const k = known(t);
          if (k && cardValue(k) < mine) return { score: 90, action: { ...base, target: t } };
        }
        let win = 0;
        let lose = 0;
        for (const [kind, n] of Object.entries(unseen) as [CardKind, number][]) {
          if (cardValue(kind) < mine) win += n;
          else if (cardValue(kind) > mine) lose += n;
        }
        const safe = others.filter((t) => !known(t) || cardValue(known(t)!) <= mine);
        if (safe.length === 0) return { score: -80, action: { ...base, target: others[0] } };
        return { score: ((win - lose) / pool) * 45, action: { ...base, target: leaderFirst(safe)[0] } };
      }
      case "priest":
        return { score: others.length ? 14 : 2, action: others.length ? { ...base, target: leaderFirst(others)[0] } : base };
      case "handmaid":
        return { score: 22, action: base };
      case "prince": {
        const princessHolder = others.find((t) => known(t) === "princess");
        if (princessHolder) return { score: 95, action: { ...base, target: princessHolder } };
        if (others.length) return { score: 16, action: { ...base, target: leaderFirst(others)[0] } };
        // Only myself is left as a target.
        return { score: other === "princess" ? -1000 : other && cardValue(other) <= 2 ? 10 : -5, action: { ...base, target: botId } };
      }
      case "chancellor":
        return { score: state.deck.length > 0 ? 20 : 1, action: base };
      case "king":
        if (others.length === 0) return { score: 0, action: base };
        return { score: other && cardValue(other) <= 3 ? 12 : -25, action: { ...base, target: leaderFirst(others)[0] } };
      case "countess":
        return { score: 8, action: base };
      case "spy":
        return { score: 26, action: base };
      case "princess":
        return { score: -1000, action: base };
    }
  }
}
