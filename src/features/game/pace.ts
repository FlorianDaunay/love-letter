import type { Speed } from "@/store/profile";

/** Multiplier applied to every staged animation and to the bots' thinking time. */
export const SPEED_FACTOR: Record<Speed, number> = { slow: 1.6, normal: 1, fast: 0.55 };
export const SPEEDS: Speed[] = ["slow", "normal", "fast"];

/** How long a played card stays on stage at normal speed. */
export const PLAY_STAGE_MS = 2800;
export const NO_EFFECT_STAGE_MS = 1600;
export const ROUND_STAGE_MS = 1400;

/** Bots wait for the previous play to be shown before playing (host side). */
export const botDelayFor = (speed: Speed) => Math.round((PLAY_STAGE_MS + 500) * SPEED_FACTOR[speed]);
