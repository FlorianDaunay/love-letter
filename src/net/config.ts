export const PEER_PREFIX = "loveletter-fd";
export const HEARTBEAT_MS = 1000;
/** A peer silent for longer is considered gone (closing a tab rarely closes the channel fast). */
export const PEER_TIMEOUT_MS = 8000;
/** How long others try to reach a migration candidate before moving to the next one. */
export const MIGRATION_ATTEMPT_MS = 15000;
/** After a takeover, peers that never came back are marked away after this delay. */
export const MIGRATION_GRACE_MS = 20000;
/** Highest epoch probed when joining. */
export const MAX_EPOCH_PROBE = 12;
export const CONNECT_TIMEOUT_MS = 6000;
/** Delay before a bot acts, so humans can follow. */
export const BOT_DELAY_MS = 1500;
/** A disconnected human whose turn it is gets played automatically after this delay. */
export const AUTOPILOT_DELAY_MS = 15000;
export const CHAT_LIMIT = 80;

export const hostPeerId = (code: string, epoch: number) => `${PEER_PREFIX}-${code}-${epoch}`;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const randomCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
