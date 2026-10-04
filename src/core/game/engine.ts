import { Rng } from "../rng";
import { CARDS, CARD_KINDS, TOKENS_TO_WIN, cardValue, MAX_PLAYERS, MIN_PLAYERS } from "./cards";
import { alivePlayers, findPlayer, handValue, mustPlayCountess, validTargets } from "./rules";
import {
  GAME_VERSION,
  type ActionResult,
  type Card,
  type GameAction,
  type GameEvent,
  type GameState,
  type NewPlayer,
  type Player,
} from "./types";

const LOG_LIMIT = 120;

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** Mutable context for one reducer step. */
class Step {
  rng: Rng;
  constructor(
    public s: GameState,
    public now: number
  ) {
    this.rng = new Rng(s.rngState);
    s.events = [];
  }
  log(key: string, params: Record<string, string | number> = {}) {
    this.s.log.push({ key, params, at: this.now });
    if (this.s.log.length > LOG_LIMIT) this.s.log.splice(0, this.s.log.length - LOG_LIMIT);
  }
  emit(event: DistributiveOmit<GameEvent, "seq">) {
    this.s.events.push({ ...event, seq: ++this.s.seq } as GameEvent);
  }
  player(id: string): Player {
    const p = findPlayer(this.s, id);
    if (!p) throw new Error(`unknown player ${id}`);
    return p;
  }
  done(): GameState {
    this.s.rngState = this.rng.state;
    this.s.updatedAt = this.now;
    return this.s;
  }
}

export function createGame(players: NewPlayer[], seed: number, now: number, startPlayer?: string): GameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error("player count");
  const state: GameState = {
    version: GAME_VERSION,
    players: players.map((p) => ({
      ...p,
      tokens: 0,
      hand: [],
      discard: [],
      eliminated: false,
      protected: false,
    })),
    deck: [],
    setAside: null,
    faceUp: [],
    round: 0,
    phase: "roundEnd",
    current: players[0].id,
    roundStarter: players[0].id,
    tokensToWin: TOKENS_TO_WIN[players.length],
    knowledge: {},
    lastRound: null,
    winners: [],
    events: [],
    seq: 0,
    log: [],
    rngState: seed >>> 0,
    nextUid: 1,
    updatedAt: now,
  };
  const step = new Step(state, now);
  const first = startPlayer && findPlayer(state, startPlayer) ? startPlayer : step.rng.pick(state.players).id;
  startRound(step, first);
  return step.done();
}

function draw(step: Step, player: Player): Card | null {
  const card = step.s.deck.pop() ?? null;
  if (card) player.hand.push(card);
  return card;
}

function startRound(step: Step, starter: string) {
  const s = step.s;
  s.round++;
  s.phase = "turn";
  s.knowledge = {};
  s.lastRound = null;
  const deck: Card[] = [];
  for (const kind of CARD_KINDS) for (let i = 0; i < CARDS[kind].count; i++) deck.push({ uid: s.nextUid++, kind });
  step.rng.shuffle(deck);
  s.deck = deck;
  s.setAside = s.deck.pop() ?? null;
  s.faceUp = s.players.length === 2 ? s.deck.splice(s.deck.length - 3, 3) : [];
  for (const p of s.players) {
    p.hand = [];
    p.discard = [];
    p.eliminated = false;
    p.protected = false;
  }
  // Deal one card each, starting with the first player.
  const startIndex = s.players.findIndex((p) => p.id === starter);
  for (let i = 0; i < s.players.length; i++) draw(step, s.players[(startIndex + i) % s.players.length]);
  s.roundStarter = starter;
  step.log("log.roundStart", { round: s.round });
  step.emit({ type: "roundStart", round: s.round });
  beginTurn(step, starter);
}

function beginTurn(step: Step, playerId: string) {
  const player = step.player(playerId);
  step.s.current = playerId;
  step.s.phase = "turn";
  player.protected = false;
  draw(step, player);
}

function eliminate(step: Step, player: Player) {
  player.eliminated = true;
  player.protected = false;
  player.discard.push(...player.hand);
  player.hand = [];
  step.log("log.eliminated", { player: player.id });
}

function learn(step: Step, viewer: string, target: string, card: Card) {
  (step.s.knowledge[viewer] ??= {})[target] = { uid: card.uid, kind: card.kind };
}

function endTurn(step: Step) {
  const s = step.s;
  const alive = alivePlayers(s);
  if (alive.length <= 1 || s.deck.length === 0) return endRound(step);
  const index = s.players.findIndex((p) => p.id === s.current);
  for (let i = 1; i <= s.players.length; i++) {
    const next = s.players[(index + i) % s.players.length];
    if (!next.eliminated) return beginTurn(step, next.id);
  }
}

function endRound(step: Step) {
  const s = step.s;
  const alive = alivePlayers(s);
  let winners: string[];
  let reason: "lastStanding" | "deckEmpty";
  if (alive.length === 1) {
    reason = "lastStanding";
    winners = [alive[0].id];
  } else {
    reason = "deckEmpty";
    const best = Math.max(...alive.map(handValue));
    winners = alive.filter((p) => handValue(p) === best).map((p) => p.id);
    step.log("log.deckEmpty");
  }
  const spies = alive.filter((p) => p.discard.some((c) => c.kind === "spy"));
  const spy = spies.length === 1 ? spies[0].id : null;
  for (const id of winners) step.player(id).tokens++;
  step.log("log.roundWon", { players: winners.join(",") });
  if (spy) {
    step.player(spy).tokens++;
    step.log("log.spyBonus", { player: spy });
  }
  s.lastRound = {
    reason,
    winners,
    spy,
    hands: s.players.map((p) => ({ playerId: p.id, card: p.eliminated ? null : (p.hand[0] ?? null) })),
  };

  const top = Math.max(...s.players.map((p) => p.tokens));
  const leaders = s.players.filter((p) => p.tokens === top);
  if (top >= s.tokensToWin && leaders.length === 1) {
    s.phase = "gameOver";
    s.winners = [leaders[0].id];
    step.log("log.gameWon", { player: leaders[0].id });
    step.emit({ type: "gameOver", winners: s.winners });
    return;
  }
  s.phase = "roundEnd";
  // The round winner starts the next one (a random tied winner on a tie).
  s.current = step.rng.pick(winners);
  step.emit({ type: "roundEnd", winners, spy });
}

function play(step: Step, actorId: string, action: Extract<GameAction, { type: "play" }>): string | null {
  const s = step.s;
  if (s.phase !== "turn") return "error.notNow";
  if (s.current !== actorId) return "error.notYourTurn";
  const actor = step.player(actorId);
  const card = actor.hand.find((c) => c.uid === action.uid);
  if (!card) return "error.noSuchCard";
  if (mustPlayCountess(actor.hand) && card.kind !== "countess") return "error.mustPlayCountess";

  const def = CARDS[card.kind];
  const targets = validTargets(s, actorId, card.kind);
  let target: Player | null = null;
  if (def.targets !== "none") {
    if (targets.length > 0) {
      if (!action.target) return "error.needTarget";
      if (!targets.includes(action.target)) return "error.badTarget";
      target = step.player(action.target);
    } else if (action.target) return "error.badTarget";
  }
  if (card.kind === "guard" && target) {
    if (!action.guess || !CARD_KINDS.includes(action.guess)) return "error.needGuess";
    if (action.guess === "guard") return "error.badGuess";
  }

  actor.hand = actor.hand.filter((c) => c.uid !== card.uid);
  actor.discard.push(card);
  const event: Extract<GameEvent, { type: "play" }> = { seq: 0, type: "play", actor: actorId, card };
  if (target) event.target = target.id;
  step.log(target ? "log.playOn" : "log.play", { actor: actorId, card: card.kind, ...(target ? { target: target.id } : {}) });

  if (def.targets === "other" && !target) {
    event.noEffect = true;
    step.log("log.noEffect");
  }

  switch (card.kind) {
    case "guard":
      if (target) {
        event.guess = action.guess;
        const hit = target.hand[0]?.kind === action.guess;
        step.log(hit ? "log.guardHit" : "log.guardMiss", { target: target.id, guess: action.guess! });
        if (hit) {
          event.eliminated = target.id;
          eliminate(step, target);
        }
      }
      break;
    case "priest":
      if (target && target.hand[0]) {
        event.seen = [{ playerId: target.id, card: target.hand[0] }];
        learn(step, actorId, target.id, target.hand[0]);
      }
      break;
    case "baron":
      if (target && target.hand[0] && actor.hand[0]) {
        const mine = actor.hand[0];
        const theirs = target.hand[0];
        event.seen = [
          { playerId: actorId, card: mine },
          { playerId: target.id, card: theirs },
        ];
        const diff = cardValue(mine.kind) - cardValue(theirs.kind);
        if (diff === 0) {
          learn(step, actorId, target.id, theirs);
          learn(step, target.id, actorId, mine);
          step.log("log.baronTie");
        } else {
          const loser = diff > 0 ? target : actor;
          event.eliminated = loser.id;
          eliminate(step, loser);
        }
      }
      break;
    case "handmaid":
      actor.protected = true;
      break;
    case "prince":
      if (target) {
        const discarded = target.hand.shift();
        if (discarded) {
          target.discard.push(discarded);
          event.discarded = discarded;
          step.log("log.princeDiscard", { target: target.id, card: discarded.kind });
          if (discarded.kind === "princess") {
            event.eliminated = target.id;
            eliminate(step, target);
          } else {
            const fresh = s.deck.pop() ?? s.setAside;
            if (fresh === s.setAside) s.setAside = null;
            if (fresh) target.hand.push(fresh);
          }
        }
      }
      break;
    case "chancellor": {
      let drawn = 0;
      while (drawn < 2 && draw(step, actor)) drawn++;
      if (drawn > 0) {
        s.phase = "chancellor";
        step.emit(event);
        return null; // the turn ends once the extra cards are returned
      }
      event.noEffect = true;
      break;
    }
    case "king":
      if (target) {
        [actor.hand, target.hand] = [target.hand, actor.hand];
        if (actor.hand[0]) learn(step, target.id, actorId, actor.hand[0]);
        if (target.hand[0]) learn(step, actorId, target.id, target.hand[0]);
      }
      break;
    case "princess":
      event.eliminated = actorId;
      eliminate(step, actor);
      break;
    case "spy":
    case "countess":
      break;
  }

  step.emit(event);
  endTurn(step);
  return null;
}

function chancellorReturn(step: Step, actorId: string, uids: number[]): string | null {
  const s = step.s;
  if (s.phase !== "chancellor") return "error.notNow";
  if (s.current !== actorId) return "error.notYourTurn";
  const actor = step.player(actorId);
  const toReturn = actor.hand.length - 1;
  if (uids.length !== toReturn || new Set(uids).size !== uids.length) return "error.chancellorCount";
  const cards = uids.map((uid) => actor.hand.find((c) => c.uid === uid));
  if (cards.some((c) => !c)) return "error.noSuchCard";
  actor.hand = actor.hand.filter((c) => !uids.includes(c.uid));
  // Bottom of the deck is index 0: the first returned card goes deepest.
  s.deck.unshift(...(cards as Card[]));
  step.log("log.chancellorDone", { actor: actorId });
  step.emit({ type: "chancellorDone", actor: actorId });
  endTurn(step);
  return null;
}

/** The single entry point: validate and apply a player's action. Never mutates `state`. */
export function applyAction(state: GameState, actorId: string, action: GameAction, now: number): ActionResult {
  if (!findPlayer(state, actorId)) return { ok: false, error: "error.notInGame" };
  const step = new Step(structuredClone(state), now);
  let error: string | null;
  switch (action.type) {
    case "play":
      error = play(step, actorId, action);
      break;
    case "chancellorReturn":
      error = chancellorReturn(step, actorId, action.uids);
      break;
    case "nextRound":
      if (step.s.phase !== "roundEnd") error = "error.notNow";
      else {
        startRound(step, step.s.current);
        error = null;
      }
      break;
    default:
      error = "error.unknownAction";
  }
  return error ? { ok: false, error } : { ok: true, state: step.done() };
}
