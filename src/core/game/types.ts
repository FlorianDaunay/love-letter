import type { CardKind } from "./cards";

export const GAME_VERSION = 1;

export interface Card {
  /** Unique within a round: lets the UI follow one card from deck to hand to discard. */
  uid: number;
  kind: CardKind;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  tokens: number;
  hand: Card[];
  /** Cards played or discarded this round, oldest first (face up). */
  discard: Card[];
  eliminated: boolean;
  /** Handmaid protection, until the start of this player's next turn. */
  protected: boolean;
}

/** What a player privately knows about another player's hand (Priest, Baron, King). */
export interface Knowledge {
  /** Valid while the target still holds this exact card. */
  uid: number;
  kind: CardKind;
}

export type Phase = "turn" | "chancellor" | "roundEnd" | "gameOver";

export interface LogEntry {
  key: string;
  params: Record<string, string | number>;
  at: number;
}

/** The latest thing that happened, for animations and sounds. `seq` grows by one per event. */
export type GameEvent =
  | { seq: number; type: "roundStart"; round: number }
  | {
      seq: number;
      type: "play";
      actor: string;
      card: Card;
      target?: string;
      guess?: CardKind;
      /** Who was knocked out by this play, if anyone. */
      eliminated?: string;
      /** Cards shown to the actor (Priest) or exchanged between the two (Baron). */
      seen?: { playerId: string; card: Card }[];
      /** Prince: the card the target had to discard. */
      discarded?: Card;
      noEffect?: boolean;
    }
  | { seq: number; type: "chancellorDone"; actor: string }
  | { seq: number; type: "roundEnd"; winners: string[]; spy: string | null }
  | { seq: number; type: "gameOver"; winners: string[] };

export interface RoundResult {
  reason: "lastStanding" | "deckEmpty";
  winners: string[];
  /** Player who gained the Spy bonus. */
  spy: string | null;
  /** Hands still held when the round ended. */
  hands: { playerId: string; card: Card | null }[];
}

export interface GameState {
  version: number;
  players: Player[];
  /** Draw pile; the top is the end of the array. */
  deck: Card[];
  /** Card removed face down at the start of the round (drawn only by a late Prince). */
  setAside: Card | null;
  /** Two-player games remove three more cards face up. */
  faceUp: Card[];
  round: number;
  phase: Phase;
  /** Player whose turn it is (or who must finish a Chancellor). */
  current: string;
  /** Player who started the current round. */
  roundStarter: string;
  tokensToWin: number;
  knowledge: Record<string, Record<string, Knowledge>>;
  lastRound: RoundResult | null;
  winners: string[];
  /** Events produced by the last action, in order (animations, sounds). */
  events: GameEvent[];
  /** Seq of the last event ever emitted. */
  seq: number;
  log: LogEntry[];
  rngState: number;
  nextUid: number;
  /** Time of the last state change, used by the host to pace bots. */
  updatedAt: number;
}

export type GameAction =
  | { type: "play"; uid: number; target?: string; guess?: CardKind }
  /** Chancellor: the cards to put under the deck, the first one ends up at the very bottom. */
  | { type: "chancellorReturn"; uids: number[] }
  | { type: "nextRound" };

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string };

export interface NewPlayer {
  id: string;
  name: string;
  isBot: boolean;
}
