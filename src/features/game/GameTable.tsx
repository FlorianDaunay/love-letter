import { AnimatePresence, motion } from "framer-motion";
import { LogOut, PanelRight, Shield, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/audio/sound";
import { CARDS, GUARD_GUESSES, mustPlayCountess, playableCards, validTargets, type CardKind, type GameState } from "@/core/game";
import type { SessionView } from "@/net/session";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { useSessionStore } from "@/store/session";
import { Card, CardSlot } from "@/ui/Card";
import { ChancellorPanel } from "./ChancellorPanel";
import { EventStage } from "./EventStage";
import { playerName, seatColor } from "./names";
import { RoundModal } from "./RoundModal";
import { DiscardFan, FavorRow, Seat } from "./Seat";
import { SidePanel } from "./SidePanel";

interface Selection {
  uid: number | null;
  target: string | null;
  guess: CardKind | null;
}
const EMPTY: Selection = { uid: null, target: null, guess: null };

export function GameTable({ view }: { view: SessionView }) {
  const t = useT();
  const navigate = useNavigate();
  const room = view.room!;
  const game = room.game!;
  const myId = view.myId;
  const session = useSessionStore((s) => s.session)!;
  const dispatch = useSessionStore((s) => s.dispatch);
  const leave = useSessionStore((s) => s.leave);
  const { sound, setSound } = useProfile();
  const [sel, setSel] = useState<Selection>(EMPTY);
  const [stageIdle, setStageIdle] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  const me = game.players.find((p) => p.id === myId);
  const myIndex = Math.max(0, game.players.findIndex((p) => p.id === myId));
  // Opponents clockwise from my left.
  const opponents = useMemo(
    () => [...game.players.slice(myIndex + 1), ...game.players.slice(0, myIndex)].filter((p) => p.id !== myId),
    [game.players, myIndex, myId]
  );
  const myTurn = game.phase === "turn" && game.current === myId;
  const playable = playableCards(game, myId);
  const selected = me?.hand.find((c) => c.uid === sel.uid) ?? null;
  const targets = selected ? validTargets(game, myId, selected.kind) : [];
  const needsTarget = !!selected && CARDS[selected.kind].targets !== "none" && targets.length > 0;
  const needsGuess = selected?.kind === "guard" && !!sel.target;
  const ready = !!selected && (!needsTarget || !!sel.target) && (!needsGuess || !!sel.guess);
  const away = (id: string) => room.lobby.some((p) => p.id === id && !p.isBot && !p.connected);

  // A new state invalidates a half-made choice.
  useEffect(() => setSel(EMPTY), [game.seq, game.current, game.phase]);

  useEffect(() => {
    if (myTurn) playSound("turn", 0.2);
  }, [myTurn, game.round]);

  const pick = (uid: number) => {
    if (!myTurn || !playable.some((c) => c.uid === uid)) return;
    playSound("click");
    setSel(sel.uid === uid ? EMPTY : { uid, target: null, guess: null });
  };
  const chooseTarget = (id: string) => {
    if (!needsTarget || !targets.includes(id)) return;
    playSound("click");
    setSel({ ...sel, target: id, guess: null });
  };
  const play = () => {
    if (!ready || !selected) return;
    dispatch({ type: "play", uid: selected.uid, target: sel.target ?? undefined, guess: sel.guess ?? undefined });
    setSel(EMPTY);
  };
  const quit = () => {
    leave();
    navigate("/");
  };

  const showRound = stageIdle && (game.phase === "roundEnd" || game.phase === "gameOver") && !!game.lastRound;

  return (
    <div className="felt relative flex flex-1 gap-3 p-2 sm:p-3 lg:p-4">
      <div className="relative flex min-w-0 flex-1 flex-col gap-3">
        {/* top bar */}
        <div className="flex items-center gap-2">
          <span className="display text-xl font-semibold sm:text-2xl">{t("game.round", { n: game.round })}</span>
          <span className="badge hidden sm:inline-flex">{t("lobby.tokens", { n: game.tokensToWin })}</span>
          {!view.offline && <span className="badge font-mono">{room.code}</span>}
          <div className="ml-auto flex items-center gap-1">
            <button className="btn-icon sm:hidden" onClick={() => setSound(!sound)} aria-label={t("settings.sound")}>
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button className="btn-icon lg:hidden" onClick={() => setPanelOpen(true)} aria-label={t("game.log")}>
              <PanelRight size={18} />
            </button>
            <button className="btn btn-ghost" onClick={quit} title={t("game.leave")}>
              <LogOut size={16} /> <span className="hidden sm:inline">{t("game.leave")}</span>
            </button>
          </div>
        </div>

        {/* opponents */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {opponents.map((p) => (
            <Seat
              key={p.id}
              game={game}
              player={p}
              myId={myId}
              away={away(p.id)}
              targetable={needsTarget && targets.includes(p.id)}
              targeted={sel.target === p.id}
              onTarget={() => chooseTarget(p.id)}
            />
          ))}
        </div>

        {/* center */}
        <CenterPiles game={game} />

        {/* me */}
        {me && (
          <div
            data-testid="me"
            className={`relative mx-auto flex w-full max-w-3xl flex-col items-center gap-2 rounded-card border p-3 transition-colors ${
              needsTarget && targets.includes(myId) ? "cursor-pointer border-accent bg-accent/5" : "border-transparent"
            }`}
            onClick={() => needsTarget && targets.includes(myId) && chooseTarget(myId)}
          >
            <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-2 font-semibold">
                <span className="h-3 w-3 rounded-pill" style={{ background: seatColor(game, myId) }} />
                {me.name}
                {me.protected && <Shield size={16} className="text-success" aria-label={t("game.protected")} />}
                {me.eliminated && <span className="text-xs uppercase tracking-wider text-danger">{t("game.eliminated")}</span>}
              </span>
              <FavorRow count={me.tokens} max={game.tokensToWin} size={16} />
              <DiscardFan player={me} />
            </div>
            <div data-testid="hand" className="flex min-h-[10rem] items-end justify-center gap-3 sm:min-h-[13rem] sm:gap-5">
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
              noTarget={!!selected && CARDS[selected.kind].targets !== "none" && targets.length === 0}
              target={sel.target}
              needsGuess={needsGuess}
              guess={sel.guess}
              ready={ready}
              onGuess={(guess) => (playSound("click"), setSel({ ...sel, guess }))}
              onPlay={play}
              onCancel={() => setSel(EMPTY)}
              nameOf={(id) => playerName(room, id)}
            />
          </div>
        )}

        <EventStage room={room} myId={myId} onIdle={setStageIdle} />
      </div>

      <SidePanel view={view} className="hidden w-80 shrink-0 lg:flex" />

      <AnimatePresence>
        {panelOpen && (
          <motion.div className="fixed inset-0 z-40 flex justify-end bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanelOpen(false)}>
            <motion.div
              className="flex h-full w-[min(22rem,92vw)] flex-col gap-2 bg-canvas p-3 shadow-overlay"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="btn-icon self-end" onClick={() => setPanelOpen(false)} aria-label={t("common.close")}>
                <X size={18} />
              </button>
              <SidePanel view={view} className="flex-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

function CenterPiles({ game }: { game: GameState }) {
  const t = useT();
  const top = game.deck.at(-1);
  const layers = Math.min(4, Math.max(0, game.deck.length - 1));
  return (
    <div className="flex flex-1 items-center justify-center gap-6 py-2 sm:gap-10">
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          {Array.from({ length: layers }, (_, i) => (
            <div key={i} className="absolute inset-0" style={{ transform: `translate(${(layers - i) * 2}px, ${(layers - i) * 2}px)` }}>
              <Card kind={null} size="md" />
            </div>
          ))}
          {top ? <Card key={top.uid} uid={top.uid} kind={null} size="md" /> : <CardSlot size="md" />}
        </div>
        <span className="text-xs text-text-muted">
          {t("game.deck")} · <span className="font-mono font-semibold text-text-secondary">{game.deck.length}</span>
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        {game.setAside ? <Card uid={game.setAside.uid} kind={null} size="sm" rotate={-6} /> : <CardSlot size="sm" />}
        <span className="text-xs text-text-muted">{t("game.setAside")}</span>
      </div>
      {game.faceUp.length > 0 && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            {game.faceUp.map((c) => (
              <Card key={c.uid} uid={c.uid} kind={c.kind} size="sm" />
            ))}
          </div>
          <span className="text-xs text-text-muted">{t("game.faceUp")}</span>
        </div>
      )}
    </div>
  );
}

interface ActionBarProps {
  game: GameState;
  myId: string;
  myTurn: boolean;
  selectedKind: CardKind | null;
  needsTarget: boolean;
  noTarget: boolean;
  target: string | null;
  needsGuess: boolean;
  guess: CardKind | null;
  ready: boolean;
  onGuess: (kind: CardKind) => void;
  onPlay: () => void;
  onCancel: () => void;
  nameOf: (id: string) => string;
}

function ActionBar(props: ActionBarProps) {
  const t = useT();
  const { game, myId, myTurn, selectedKind, needsTarget, noTarget, target, needsGuess, guess, ready } = props;
  const me = game.players.find((p) => p.id === myId)!;

  let message: string;
  if (game.phase === "roundEnd" || game.phase === "gameOver") message = "";
  else if (!myTurn) message = me.eliminated && game.current !== myId ? t("game.eliminated") + " · " + t("game.waiting", { player: props.nameOf(game.current) }) : t("game.waiting", { player: props.nameOf(game.current) });
  else if (!selectedKind) message = mustPlayCountess(me.hand) ? t("game.mustCountess") : t("game.chooseCard");
  else if (noTarget) message = t("game.noTarget");
  else if (needsTarget && !target) message = t("game.chooseTarget");
  else if (needsGuess && !guess) message = t("game.chooseGuess");
  else message = target ? `${t(`card.${selectedKind}`)} → ${props.nameOf(target)}${guess ? ` · ${t(`card.${guess}`)} ?` : ""}` : t(`card.${selectedKind}`);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`min-h-[1.5rem] text-center text-sm ${myTurn ? "font-semibold text-accent" : "text-text-secondary"}`}
        >
          {myTurn && !selectedKind ? <span className="display mr-2 text-lg">{t("game.yourTurn")} ·</span> : null}
          {message}
        </motion.p>
      </AnimatePresence>
      {needsGuess && (
        <motion.div data-testid="guesses" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-center gap-1.5">
          {GUARD_GUESSES.map((kind) => (
            <button
              key={kind}
              onClick={() => props.onGuess(kind)}
              className={`flex flex-col items-center gap-0.5 rounded-tile p-1 transition-colors ${guess === kind ? "bg-accent/15 ring-2 ring-accent" : "hover:bg-surface-hover"}`}
              aria-pressed={guess === kind}
              title={t(`card.${kind}`)}
            >
              <Card kind={kind} size="xs" />
              <span className="text-[10px] font-medium leading-none">{t(`card.${kind}`)}</span>
            </button>
          ))}
        </motion.div>
      )}
      {myTurn && selectedKind && (
        <div className="flex gap-2">
          <button className="btn" onClick={props.onCancel}>
            {t("game.cancel")}
          </button>
          <button data-testid="play" className="btn btn-primary min-w-[7rem]" onClick={props.onPlay} disabled={!ready}>
            {t("game.play")}
          </button>
        </div>
      )}
    </div>
  );
}
