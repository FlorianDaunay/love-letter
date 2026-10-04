import type { CardKind } from "@/core/game";

/** Illustration colours: fixed, theme-independent (cards are physical objects). */
export const INK = "#2B2118";
export const PARCHMENT = "#F6EEDC";
export const PARCHMENT_SHADE = "#E9DCC0";
export const GOLD = "#C9A24A";
export const GOLD_LIGHT = "#E8CF8A";
export const BACK = "#5E1622";
export const BACK_DEEP = "#3C0D16";

export const CARD_COLORS: Record<CardKind, string> = {
  spy: "#3E4756",
  guard: "#2F5D7C",
  priest: "#4F7A55",
  baron: "#8A5A2B",
  handmaid: "#2C7A76",
  prince: "#2C4A8C",
  chancellor: "#6B3F78",
  king: "#8C1C2B",
  countess: "#A3385F",
  princess: "#B07A1E",
};

/** Player seat colours (validated for distinctness on both light and dark tables). */
export const SEAT_COLORS = ["#C2410C", "#2563EB", "#059669", "#9333EA", "#CA8A04", "#DB2777"];
