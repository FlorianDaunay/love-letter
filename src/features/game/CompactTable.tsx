import { AnimatePresence, motion } from "framer-motion";
import { Bot, Eye, LogOut, Maximize2, PanelRight, Shield, Volume2, VolumeX, WifiOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cardValue, knownCard, type GameState, type Player } from "@/core/game";
import type { SessionView } from "@/net/session";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { useSessionStore } from "@/store/session";
import { Card } from "@/ui/Card";
import { FavorToken } from "@/ui/CardArt";
import { CARD_COLORS, PARCHMENT } from "@/ui/palette";
import { ChancellorPanel } from "./ChancellorPanel";
import { EventStage } from "./EventStage";
import { ActionBar } from "./GameTable";
import { playerName, seatColor } from "./names";
import { RoundModal } from "./RoundModal";
import { DiscardFan, FavorRow } from "./Seat";
import { PanelDrawer } from "./SidePanel";
import { usePlay } from "./usePlay";

/**
 * A player's own device in a projector room: the table is on the shared screen, so this keeps
 * only what that screen cannot show (my hand, what I know) plus one line per opponent.
 */
export function CompactTable({ view, onFull }: { view: SessionView; onFull: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const room = view.room!;
  const game = room.game!;
  const myId = view.myId;
  const session = useSessionStore((s) => s.session)!;
  const dispatch = useSessionStore((s) => s.dispatch);
  const leave = useSessionStore((s) => s.leave);
  const { sound, setSound } = useProfile();
  const [stageIdle, setStageIdle] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const { me, myTurn, playable, sel, selected, needsTarget, noTarget, needsGuess, ready, pick, chooseTarget, canTarget, guess, play, cancel } = usePlay(game, myId);

  const myIndex = Math.max(0, game.players.findIndex((p) => p.id === myId));
  const opponents = [...game.players.slice(myIndex + 1), ...game.players.slice(0, myIndex)].filter((p) => p.id !== myId);
  const away = (id: string) => room.lobby.some((p) => p.id === id && !p.isBot && !p.connected);
  const quit = () => {
    leave();
    navigate("/");
  };
  const showRound = stageIdle && (game.phase === "roundEnd" || game.phase === "gameOver") && !!game.lastRound;

  return (
    <div className="felt relative flex h-[100dvh] min-h-0 flex-col gap-2 overflow-hidden p-2 sm:h-[calc(100dvh-3.5rem)] sm:p-3">
      <div className="flex items-center gap-2">
        <span className="display text-xl font-semibold">{t("game.round", { n: game.round })}</span>
        <span className="badge">
          {t("game.deck")} <span className="font-mono font-semibold">{game.deck.length}</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-icon" onClick={onFull} title={t("projector.full")} aria-label={t("projector.full")}>
            <Maximize2 size={18} />
          </button>
          <button className="btn-icon" onClick={() => setPanelOpen(true)} aria-label={t("game.log")}>
            <PanelRight size={18} />
          </button>
          <button className="btn-icon" onClick={() => setSound(!sound)} aria-label={t("settings.sound")}>
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button className="btn-icon" onClick={quit} title={t("game.leave")} aria-label={t("game.leave")}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <ul className="scrollbar-thin flex max-h-[40%] shrink-0 flex-col gap-1 overflow-y-auto">
        {opponents.map((p) => (
          <OpponentRow key={p.id} game={game} player={p} myId={myId} away={away(p.id)} targetable={canTarget(p.id)} targeted={sel.target === p.id} onTarget={() => chooseTarget(p.id)} />
        ))}
      </ul>

      {me && (
        <div
          className={`relative flex min-h-0 flex-1 flex-col items-center justify-end gap-2 rounded-card border p-2 transition-colors ${
            canTarget(myId) ? "cursor-pointer border-accent bg-accent/5" : "border-transparent"
          }`}
          onClick={() => chooseTarget(myId)}
        >
          <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-2 font-semibold">
              <span className="h-3 w-3 rounded-pill" style={{ background: seatColor(game, myId) }} />
              {me.name}
              {me.protected && <Shield size={16} className="text-success" aria-label={t("game.protected")} />}
            </span>
            <FavorRow count={me.tokens} max={game.tokensToWin} size={14} />
            <DiscardFan player={me} />
          </div>
          <div className="flex flex-1 items-center justify-center gap-3">
            <AnimatePresence>
              {me.hand.map((c) => (
                <Card
                  key={c.uid}
                  uid={c.uid}
                  kind={c.kind}
                  size="lg"
                  detailed
                  selected={sel.uid === c.uid}
                  dimmed={myTurn && !playable.some((p) => p.uid === c.uid)}
                  onClick={myTurn ? () => pick(c.uid) : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
          <ActionBar
            game={game}
            myId={myId}
            myTurn={myTurn}
            selectedKind={selected?.kind ?? null}
            needsTarget={needsTarget}
            noTarget={noTarget}
            target={sel.target}
            needsGuess={needsGuess}
            guess={sel.guess}
            ready={ready}
            onGuess={guess}
            onPlay={play}
            onCancel={cancel}
            nameOf={(id) => playerName(room, id)}
          />
        </div>
      )}

      <EventStage room={room} myId={myId} onIdle={setStageIdle} onlyMine />

      <PanelDrawer view={view} open={panelOpen} onClose={() => setPanelOpen(false)} className="" />

      <AnimatePresence>
        {stageIdle && game.phase === "chancellor" && game.current === myId && me && (
          <ChancellorPanel hand={me.hand} onConfirm={(uids) => dispatch({ type: "chancellorReturn", uids })} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRound && (
          <RoundModal
            room={room}
            myId={myId}
            isHost={view.isHost}
            onNext={() => dispatch({ type: "nextRound" })}
            onLobby={() => session.backToLobby()}
            onLeave={quit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface OpponentRowProps {
  game: GameState;
  player: Player;
  myId: string;
  away: boolean;
  targetable: boolean;
  targeted: boolean;
  onTarget: () => void;
}

/** One line per opponent: turn, favors, protection, what I know of their hand, their discards. */
function OpponentRow({ game, player, myId, away, targetable, targeted, onTarget }: OpponentRowProps) {
  const t = useT();
  const isTurn = game.current === player.id && (game.phase === "turn" || game.phase === "chancellor");
  const known = knownCard(game, myId, player.id);
  const color = seatColor(game, player.id);

  return (
    <motion.li
      layout
      onClick={targetable ? onTarget : undefined}
      role={targetable ? "button" : undefined}
      tabIndex={targetable ? 0 : undefined}
      onKeyDown={targetable ? (e) => (e.key === "Enter" || e.key === " ") && onTarget() : undefined}
      animate={{ opacity: player.eliminated ? 0.5 : 1 }}
      className={`relative flex min-h-[2.75rem] items-center gap-2 rounded-tile border bg-surface/90 px-2 py-1.5 ${
        targetable ? "cursor-pointer border-accent" : "border-border"
      } ${targeted ? "ring-2 ring-accent" : ""}`}
      style={isTurn ? { boxShadow: `inset 4px 0 0 ${color}` } : undefined}
    >
      {targetable && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-tile bg-accent/10"
          animate={{ opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill text-xs font-bold text-white" style={{ background: color }}>
        {player.isBot ? <Bot size={14} /> : player.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`truncate text-sm font-semibold ${player.eliminated ? "line-through" : ""}`}>{player.name}</span>
          {away && <WifiOff size={13} className="shrink-0 text-warning" aria-label={t("game.autopilot")} />}
          {player.protected && <Shield size={14} className="shrink-0 text-success" aria-label={t("game.protected")} />}
          {player.eliminated && <span className="text-[10px] font-semibold uppercase tracking-wider text-danger">{t("game.eliminated")}</span>}
        </span>
        <span className="flex items-center gap-0.5" aria-label={t("projector.discards")}>
          {player.discard.map((c) => (
            <span
              key={c.uid}
              className="grid h-4 min-w-[1rem] place-items-center rounded-[3px] px-0.5 font-mono text-[10px] font-bold leading-none"
              style={{ background: CARD_COLORS[c.kind], color: PARCHMENT }}
              title={t(`card.${c.kind}`)}
            >
              {cardValue(c.kind)}
            </span>
          ))}
        </span>
      </div>
      {known && (
        <span className="flex shrink-0 items-center gap-1 rounded-pill bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground" title={t("game.youKnow")}>
          <Eye size={12} />
          {cardValue(known.kind)} {t(`card.${known.kind}`)}
        </span>
      )}
      <span className="flex shrink-0 items-center gap-0.5 font-mono text-sm font-semibold tabular-nums" aria-label={t("game.favor")}>
        <FavorToken size={14} dim={player.tokens === 0} />
        {player.tokens}
      </span>
    </motion.li>
  );
}
