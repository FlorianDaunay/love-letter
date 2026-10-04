import { describe, expect, it } from "vitest";
import { applyAction, chooseBotAction, createGame, knownCard, normalizeGame, type CardKind, type GameAction, type GameState } from ".";

const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, isBot: false }));

/** A game whose hands and deck are set by hand; `p0` is to play holding `hands[0]` (two cards). */
function rigged(hands: CardKind[][], deck: CardKind[] = ["guard", "guard", "guard"]): GameState {
  const g = createGame(players(hands.length), 1, 0, "p0");
  let uid = 500;
  const card = (kind: CardKind) => ({ uid: uid++, kind });
  g.players.forEach((p, i) => (p.hand = hands[i].map(card)));
  g.deck = deck.map(card);
  g.setAside = card("guard");
  g.faceUp = [];
  return g;
}

const ok = (r: ReturnType<typeof applyAction>) => {
  if (!r.ok) throw new Error(r.error);
  return r.state;
};
const uidOf = (g: GameState, pid: string, kind: CardKind) => g.players.find((p) => p.id === pid)!.hand.find((c) => c.kind === kind)!.uid;
const p = (g: GameState, id: string) => g.players.find((x) => x.id === id)!;
const totalCards = (g: GameState) =>
  g.deck.length + (g.setAside ? 1 : 0) + g.faceUp.length + g.players.reduce((n, x) => n + x.hand.length + x.discard.length, 0);

describe("setup", () => {
  it("deals a two-player round with three face-up cards", () => {
    const g = createGame(players(2), 42, 0, "p0");
    expect(g.faceUp).toHaveLength(3);
    expect(g.setAside).not.toBeNull();
    expect(p(g, "p0").hand).toHaveLength(2);
    expect(p(g, "p1").hand).toHaveLength(1);
    expect(g.deck).toHaveLength(14);
    expect(totalCards(g)).toBe(21);
    expect(g.tokensToWin).toBe(6);
  });
  it("deals four players without face-up cards", () => {
    const g = createGame(players(4), 42, 0);
    expect(g.faceUp).toHaveLength(0);
    expect(g.deck).toHaveLength(15);
    expect(g.tokensToWin).toBe(4);
  });
});

describe("cards", () => {
  it("Guard knocks out on a right guess and ends the round", () => {
    const g = rigged([["guard", "king"], ["priest"]]);
    const s = ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "guard"), target: "p1", guess: "priest" }, 1));
    expect(p(s, "p1").eliminated).toBe(true);
    expect(s.phase).toBe("roundEnd");
    expect(p(s, "p0").tokens).toBe(1);
  });
  it("Guard refuses to name a Guard and needs a guess", () => {
    const g = rigged([["guard", "king"], ["priest"]]);
    const uid = uidOf(g, "p0", "guard");
    expect(applyAction(g, "p0", { type: "play", uid, target: "p1", guess: "guard" }, 1)).toEqual({ ok: false, error: "error.badGuess" });
    expect(applyAction(g, "p0", { type: "play", uid, target: "p1" }, 1)).toEqual({ ok: false, error: "error.needGuess" });
  });
  it("Countess must be played with a King or a Prince", () => {
    const g = rigged([["countess", "prince"], ["priest"]]);
    expect(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "prince"), target: "p1" }, 1)).toEqual({ ok: false, error: "error.mustPlayCountess" });
    ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "countess") }, 1));
  });
  it("Handmaid protects: a Guard then has no effect", () => {
    let g = rigged([["handmaid", "baron"], ["guard", "priest"]]);
    g = ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "handmaid") }, 1));
    expect(p(g, "p0").protected).toBe(true);
    expect(applyAction(g, "p1", { type: "play", uid: uidOf(g, "p1", "guard"), target: "p0", guess: "baron" }, 2)).toEqual({ ok: false, error: "error.badTarget" });
    g = ok(applyAction(g, "p1", { type: "play", uid: uidOf(g, "p1", "guard") }, 2));
    expect(g.events[0]).toMatchObject({ type: "play", noEffect: true });
    expect(p(g, "p0").protected).toBe(false); // expires on own turn
  });
  it("Prince on the Princess knocks out", () => {
    const g = rigged([["prince", "guard"], ["princess"]]);
    const s = ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "prince"), target: "p1" }, 1));
    expect(p(s, "p1").eliminated).toBe(true);
  });
  it("Prince draws the set-aside card when the deck is empty", () => {
    const g = rigged([["prince", "guard"], ["priest"], ["baron"]], []);
    const setAside = g.setAside!;
    const s = ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "prince"), target: "p1" }, 1));
    expect(p(s, "p1").hand).toEqual([setAside]);
    expect(s.setAside).toBeNull();
    expect(s.phase).toBe("roundEnd");
  });
  it("Baron knocks out the lower card", () => {
    const g = rigged([["baron", "king"], ["priest"]]);
    const s = ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "baron"), target: "p1" }, 1));
    expect(p(s, "p1").eliminated).toBe(true);
  });
  it("Priest and King teach the actor the target's card", () => {
    let g = rigged([["priest", "guard"], ["baron", "spy"], ["handmaid"]]);
    g = ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "priest"), target: "p2" }, 1));
    expect(knownCard(g, "p0", "p2")?.kind).toBe("handmaid");
    const k = rigged([["king", "guard"], ["baron"]]);
    const s = ok(applyAction(k, "p0", { type: "play", uid: uidOf(k, "p0", "king"), target: "p1" }, 1));
    expect(p(s, "p0").hand.map((c) => c.kind)).toContain("baron");
    expect(knownCard(s, "p1", "p0")?.kind).toBe("baron");
    expect(s.knowledge.p0.p1.kind).toBe("guard");
  });
  it("Chancellor keeps one and puts the rest under the deck", () => {
    let g = rigged([["chancellor", "guard"], ["priest"]], ["spy", "baron", "king"]);
    g = ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "chancellor") }, 1));
    expect(g.phase).toBe("chancellor");
    expect(p(g, "p0").hand).toHaveLength(3);
    const back = [uidOf(g, "p0", "guard"), uidOf(g, "p0", "baron")];
    expect(applyAction(g, "p0", { type: "chancellorReturn", uids: [back[0]] }, 2)).toEqual({ ok: false, error: "error.chancellorCount" });
    g = ok(applyAction(g, "p0", { type: "chancellorReturn", uids: back }, 2));
    expect(p(g, "p0").hand.map((c) => c.kind)).toEqual(["king"]);
    expect(g.deck[0].uid).toBe(back[0]);
    expect(g.current).toBe("p1");
  });
  it("Princess played by hand knocks her holder out", () => {
    const g = rigged([["princess", "guard"], ["priest"]]);
    const s = ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "princess") }, 1));
    expect(p(s, "p0").eliminated).toBe(true);
    expect(p(s, "p1").tokens).toBe(1);
  });
});

describe("round end", () => {
  it("highest card wins when the deck runs out, ties all score, lone Spy scores", () => {
    const g = rigged([["spy", "king"], ["king"], ["guard"]], []);
    const s = ok(applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "spy") }, 1));
    expect(s.lastRound?.winners.sort()).toEqual(["p0", "p1"]);
    expect(s.lastRound?.spy).toBe("p0");
    expect(p(s, "p0").tokens).toBe(2);
    expect(p(s, "p1").tokens).toBe(1);
    const next = ok(applyAction(s, "p2", { type: "nextRound" }, 2));
    expect(next.round).toBe(s.round + 1);
    expect(totalCards(next)).toBe(21);
  });
  it("never mutates its input", () => {
    const g = rigged([["guard", "king"], ["priest"]]);
    const copy = structuredClone(g);
    applyAction(g, "p0", { type: "play", uid: uidOf(g, "p0", "guard"), target: "p1", guess: "priest" }, 1);
    expect(g).toEqual(copy);
  });
});

describe("bots", () => {
  it("play whole games to the end, 2 to 6 players", () => {
    for (let n = 2; n <= 6; n++) {
      for (let seed = 1; seed <= 15; seed++) {
        let g = createGame(players(n), seed * 7919 + n, 0);
        let guard = 0;
        while (g.phase !== "gameOver") {
          if (++guard > 5000) throw new Error("game does not end");
          let action: GameAction | null;
          let actor = g.current;
          if (g.phase === "roundEnd") action = { type: "nextRound" };
          else action = chooseBotAction(g, actor, seed + guard);
          if (!action) throw new Error(`bot stuck in ${g.phase}`);
          g = ok(applyAction(g, actor, action, guard));
          expect(totalCards(g)).toBe(21);
        }
        expect(g.winners).toHaveLength(1);
        expect(p(g, g.winners[0]).tokens).toBeGreaterThanOrEqual(g.tokensToWin);
      }
    }
  });
});

describe("normalizeGame", () => {
  it("fills missing fields and rejects garbage", () => {
    const g = createGame(players(3), 5, 0) as Partial<GameState>;
    delete g.knowledge;
    delete g.events;
    const n = normalizeGame(g)!;
    expect(n.knowledge).toEqual({});
    expect(n.events).toEqual([]);
    expect(normalizeGame({ nope: true })).toBeNull();
  });
});
