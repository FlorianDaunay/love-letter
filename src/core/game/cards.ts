/** The 2019 edition deck: 21 cards, values 0 to 9. */
export const CARD_KINDS = [
  "spy",
  "guard",
  "priest",
  "baron",
  "handmaid",
  "prince",
  "chancellor",
  "king",
  "countess",
  "princess",
] as const;

export type CardKind = (typeof CARD_KINDS)[number];

export interface CardDef {
  kind: CardKind;
  value: number;
  count: number;
  /** Who the card is played against: nobody, another player, or anyone including oneself. */
  targets: "none" | "other" | "any";
}

export const CARDS: Record<CardKind, CardDef> = {
  spy: { kind: "spy", value: 0, count: 2, targets: "none" },
  guard: { kind: "guard", value: 1, count: 6, targets: "other" },
  priest: { kind: "priest", value: 2, count: 2, targets: "other" },
  baron: { kind: "baron", value: 3, count: 2, targets: "other" },
  handmaid: { kind: "handmaid", value: 4, count: 2, targets: "none" },
  prince: { kind: "prince", value: 5, count: 2, targets: "any" },
  chancellor: { kind: "chancellor", value: 6, count: 2, targets: "none" },
  king: { kind: "king", value: 7, count: 1, targets: "other" },
  countess: { kind: "countess", value: 8, count: 1, targets: "none" },
  princess: { kind: "princess", value: 9, count: 1, targets: "none" },
};

export const cardValue = (kind: CardKind) => CARDS[kind].value;

/** Tokens of affection needed to win, by player count. */
export const TOKENS_TO_WIN: Record<number, number> = { 2: 6, 3: 5, 4: 4, 5: 3, 6: 3 };

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** Kinds a Guard may name (anything but a Guard). */
export const GUARD_GUESSES = CARD_KINDS.filter((k) => k !== "guard");
