import { motion } from "framer-motion";
import { Crown, LogOut, RotateCcw, SkipForward } from "lucide-react";
import type { RoomSnapshot } from "@/net/protocol";
import { useT } from "@/i18n";
import { Card } from "@/ui/Card";
import { FavorToken } from "@/ui/CardArt";
import { playerName, seatColor } from "./names";
import { FavorRow } from "./Seat";

interface Props {
  room: RoomSnapshot;
  myId: string;
  isHost: boolean;
  onNext: () => void;
  onLobby: () => void;
  onLeave: () => void;
}

/** Hearts drifting up behind the winner. */
function Hearts() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute bottom-0"
          style={{ left: `${(i * 53) % 100}%` }}
          initial={{ y: 40, opacity: 0, rotate: 0 }}
          animate={{ y: -520, opacity: [0, 1, 1, 0], rotate: (i % 2 ? 1 : -1) * 40 }}
          transition={{ duration: 3.5 + (i % 4) * 0.6, delay: (i % 6) * 0.35, repeat: Infinity, ease: "easeOut" }}
        >
          <FavorToken size={14 + (i % 3) * 8} />
        </motion.span>
      ))}
    </div>
  );
}

export function RoundModal({ room, myId, isHost, onNext, onLobby, onLeave }: Props) {
  const t = useT();
  const game = room.game!;
  const result = game.lastRound!;
  const over = game.phase === "gameOver";
  const names = (ids: string[]) => ids.map((id) => playerName(room, id)).join(", ");
  const amPlaying = game.players.some((p) => p.id === myId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ y: 40, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="card relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto p-5 shadow-overlay sm:p-6"
      >
        {over && <Hearts />}
        <div className="relative">
          <p className="label">{over ? t("game.round", { n: game.round }) : t("game.roundOver")}</p>
          <h2 className="display text-3xl font-semibold sm:text-4xl">
            {over
              ? t("game.gameOver", { player: names(game.winners) })
              : t(result.winners.length > 1 ? "game.roundWinners" : "game.roundWinner", { players: names(result.winners) })}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">{t(result.reason === "deckEmpty" ? "game.deckEmptyReason" : "game.lastStanding")}</p>
          {result.spy && <p className="mt-1 text-sm font-medium text-accent">{t("game.spyBonus", { player: playerName(room, result.spy) })}</p>}

          <ul className="mt-5 flex flex-col gap-2">
            {[...game.players]
              .sort((a, b) => b.tokens - a.tokens)
              .map((p, i) => {
                const hand = result.hands.find((h) => h.playerId === p.id)?.card ?? null;
                const won = result.winners.includes(p.id);
                return (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className={`flex items-center gap-3 rounded-tile border px-3 py-2 ${won ? "border-accent bg-accent/10" : "border-border"}`}
                  >
                    <motion.div initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}>
                      {hand ? <Card kind={hand.kind} size="sm" /> : <div className="grid aspect-[5/7] w-12 place-items-center rounded-tile border border-dashed border-border text-[10px] text-danger sm:w-14">{t("game.eliminated")}</div>}
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ background: seatColor(game, p.id) }} />
                        <span className="truncate font-semibold">{p.name}</span>
                        {won && <Crown size={16} className="shrink-0 text-accent" />}
                      </div>
                      <FavorRow count={p.tokens} max={game.tokensToWin} size={16} />
                    </div>
                  </motion.li>
                );
              })}
          </ul>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {over ? (
              <>
                <button className="btn" onClick={onLeave}>
                  <LogOut size={16} /> {t("game.leave")}
                </button>
                {isHost && (
                  <button className="btn btn-primary" onClick={onLobby}>
                    <RotateCcw size={16} /> {t("game.backToLobby")}
                  </button>
                )}
              </>
            ) : (
              amPlaying && (
                <button className="btn btn-primary" onClick={onNext} autoFocus>
                  <SkipForward size={16} /> {t("game.nextRound")}
                </button>
              )
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
