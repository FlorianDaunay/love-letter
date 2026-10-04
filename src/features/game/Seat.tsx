import { AnimatePresence, motion } from "framer-motion";
import { Bot, Eye, Shield, WifiOff } from "lucide-react";
import { knownCard, type GameState, type Player } from "@/core/game";
import { useT } from "@/i18n";
import { Card, type CardSize } from "@/ui/Card";
import { FavorToken } from "@/ui/CardArt";
import { seatColor } from "./names";

interface SeatProps {
  game: GameState;
  player: Player;
  myId: string;
  away: boolean;
  targetable: boolean;
  targeted: boolean;
  onTarget?: () => void;
}

/** Discards as a tight fan: the latest card on top. */
export function DiscardFan({ player, size = "xs" }: { player: Player; size?: CardSize }) {
  return (
    <div className="flex min-h-[2.75rem] items-end">
      {player.discard.map((c, i) => (
        <div key={c.uid} className={i === 0 ? "" : size === "xs" ? "-ml-5 sm:-ml-6" : "-ml-8 sm:-ml-9"} style={{ zIndex: i }}>
          <Card uid={c.uid} kind={c.kind} size={size} rotate={(i % 2 ? 1 : -1) * 2} />
        </div>
      ))}
    </div>
  );
}

export function FavorRow({ count, max, size = 14 }: { count: number; max: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5 text-text-muted" aria-label={`${count}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <AnimatePresence key={i} mode="popLayout">
          {i < count ? (
            <motion.span key="on" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.1 }}>
              <FavorToken size={size} />
            </motion.span>
          ) : (
            <span key="off">
              <FavorToken size={size} dim />
            </span>
          )}
        </AnimatePresence>
      ))}
    </span>
  );
}

export function Seat({ game, player, myId, away, targetable, targeted, onTarget }: SeatProps) {
  const t = useT();
  const isTurn = game.current === player.id && (game.phase === "turn" || game.phase === "chancellor");
  const known = knownCard(game, myId, player.id);
  const color = seatColor(game, player.id);

  return (
    <motion.div
      layout
      data-testid="seat"
      onClick={targetable ? onTarget : undefined}
      role={targetable ? "button" : undefined}
      tabIndex={targetable ? 0 : undefined}
      onKeyDown={targetable ? (e) => (e.key === "Enter" || e.key === " ") && onTarget?.() : undefined}
      animate={{ opacity: player.eliminated ? 0.55 : 1, scale: targeted ? 1.03 : 1 }}
      className={`relative flex min-w-[9.5rem] flex-col gap-2 rounded-card border bg-surface/90 p-2.5 shadow-card transition-colors sm:min-w-[11rem] sm:p-3 ${
        targetable ? "cursor-pointer border-accent hover:bg-surface-hover" : "border-border"
      } ${targeted ? "ring-2 ring-accent" : ""}`}
    >
      {isTurn && (
        <motion.span
          className="pointer-events-none absolute -inset-[3px] rounded-card border-2"
          style={{ borderColor: color }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
      {targetable && (
        <motion.span
          className="pointer-events-none absolute -inset-1 rounded-card bg-accent/10"
          animate={{ opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill text-xs font-bold text-white" style={{ background: color }}>
          {player.isBot ? <Bot size={14} /> : player.name.slice(0, 1).toUpperCase()}
        </span>
        <span className={`truncate text-sm font-semibold ${player.eliminated ? "line-through" : ""}`}>{player.name}</span>
        {away && <WifiOff size={14} className="shrink-0 text-warning" aria-label={t("game.autopilot")} />}
        <AnimatePresence>
          {player.protected && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="ml-auto grid h-6 w-6 place-items-center rounded-pill bg-success/15 text-success"
              title={t("game.protected")}
            >
              <Shield size={14} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <FavorRow count={player.tokens} max={game.tokensToWin} size={12} />
      <div className="flex items-end gap-3">
        <div className="flex gap-1">
          {player.hand.map((c) => (
            <div key={c.uid} className="relative">
              <Card uid={c.uid} kind={known?.uid === c.uid ? known.kind : null} size="sm" />
              {known?.uid === c.uid && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-pill bg-accent text-accent-foreground shadow" title={t("game.youKnow")}>
                  <Eye size={12} />
                </span>
              )}
            </div>
          ))}
          {player.eliminated && <span className="self-center text-xs font-semibold uppercase tracking-wider text-danger">{t("game.eliminated")}</span>}
        </div>
        <DiscardFan player={player} />
      </div>
    </motion.div>
  );
}
