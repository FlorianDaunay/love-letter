import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { playSound } from "@/audio/sound";
import type { GameEvent } from "@/core/game";
import type { RoomSnapshot } from "@/net/protocol";
import { useT, type Translate } from "@/i18n";
import { Card } from "@/ui/Card";
import { playerName } from "./names";

type PlayEvent = Extract<GameEvent, { type: "play" }>;

const DURATION: Partial<Record<GameEvent["type"], number>> = { play: 2300, roundStart: 1300 };

/**
 * Stages each new game event in the middle of the table, one after the other, with its sound.
 * Purely decorative: the table underneath is already up to date. Reports when it is idle so
 * round-end dialogs wait for the last play to be shown.
 */
export function EventStage({ room, myId, onIdle }: { room: RoomSnapshot; myId: string; onIdle: (idle: boolean) => void }) {
  const t = useT();
  const game = room.game!;
  const lastSeq = useRef(game.seq);
  const [queue, setQueue] = useState<GameEvent[]>([]);
  const [current, setCurrent] = useState<GameEvent | null>(null);

  // Remember what was already shown on mount (no replay), but never swallow a new event.
  useEffect(() => {
    const fresh = game.events.filter((e) => e.seq > lastSeq.current);
    if (fresh.length === 0) return;
    lastSeq.current = Math.max(...fresh.map((e) => e.seq));
    setQueue((q) => [...q, ...fresh]);
  }, [game.events]);

  useEffect(() => {
    onIdle(!current && queue.length === 0);
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    soundFor(next, myId);
    if (DURATION[next.type]) setCurrent(next); // others are sound only
  }, [queue, current, myId, onIdle]);

  useEffect(() => {
    if (!current) return;
    const duration = current.type === "play" && current.noEffect ? 1500 : DURATION[current.type]!;
    const timer = setTimeout(() => setCurrent(null), duration);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {current?.type === "play" && <PlayStage key={current.seq} event={current} room={room} myId={myId} t={t} />}
        {current?.type === "roundStart" && (
          <motion.div
            key={current.seq}
            initial={{ opacity: 0, scale: 0.9, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, scale: 1, letterSpacing: "0.1em" }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="display rounded-card bg-canvas/85 px-10 py-5 text-4xl font-semibold shadow-overlay backdrop-blur sm:text-5xl"
          >
            {t("game.round", { n: current.round })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayStage({ event, room, myId, t }: { event: PlayEvent; room: RoomSnapshot; myId: string; t: Translate }) {
  const name = (id?: string) => (id ? playerName(room, id) : "");
  const headline = t(event.target ? "log.playOn" : "log.play", {
    actor: name(event.actor),
    card: t(`card.${event.card.kind}`),
    target: name(event.target),
  });
  const involved = event.actor === myId || event.target === myId;

  let outcome: string | null = null;
  let tone: "danger" | "success" | "muted" = "muted";
  if (event.noEffect) outcome = t("log.noEffect");
  else if (event.card.kind === "guard" && event.guess) {
    outcome = t(event.eliminated ? "log.guardHit" : "log.guardMiss", { target: name(event.target), guess: t(`card.${event.guess}`) });
  } else if (event.card.kind === "prince" && event.discarded) {
    outcome = t("log.princeDiscard", { target: name(event.target), card: t(`card.${event.discarded.kind}`) });
  } else if (event.card.kind === "baron" && !event.eliminated) outcome = t("log.baronTie");
  else if (event.card.kind === "handmaid") {
    outcome = t("game.protected");
    tone = "success";
  } else if (event.card.kind === "priest" && event.actor === myId) outcome = t("game.youSaw", { player: name(event.target) });
  if (event.eliminated) {
    outcome = [outcome, t("log.eliminated", { player: name(event.eliminated) })].filter(Boolean).join(" ");
    tone = "danger";
  }

  // Which cards to show next to the played one, and whether this viewer may see their faces.
  const extra: { key: string; kind: string | null; label: string }[] = [];
  if (event.seen && event.card.kind === "priest") {
    const s = event.seen[0];
    extra.push({ key: "seen", kind: event.actor === myId ? s.card.kind : null, label: name(s.playerId) });
  }
  if (event.seen && event.card.kind === "baron") {
    for (const s of event.seen) {
      const visible = involved || s.playerId === event.eliminated;
      extra.push({ key: `b-${s.playerId}`, kind: visible ? s.card.kind : null, label: name(s.playerId) });
    }
  }
  if (event.card.kind === "guard" && event.guess) extra.push({ key: "guess", kind: event.guess, label: "?" });
  if (event.discarded) extra.push({ key: "disc", kind: event.discarded.kind, label: name(event.target) });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="mx-4 flex max-w-xl flex-col items-center gap-3 rounded-card bg-canvas/90 px-5 py-4 text-center shadow-overlay backdrop-blur"
    >
      <div className="flex items-end gap-3">
        <motion.div initial={{ rotateY: 180, y: -30 }} animate={{ rotateY: 0, y: 0 }} transition={{ duration: 0.5 }}>
          <Card kind={event.card.kind} size="lg" />
        </motion.div>
        {extra.map((x, i) => (
          <motion.div
            key={x.key}
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 + i * 0.25 }}
          >
            <motion.div
              animate={x.key.startsWith("b-") && event.eliminated && x.label === name(event.eliminated) ? { rotate: [0, -4, 4, -2, 0], opacity: [1, 1, 0.6] } : {}}
              transition={{ delay: 1.1, duration: 0.6 }}
            >
              <Card kind={x.kind as never} size="md" />
            </motion.div>
            <span className="max-w-[6rem] truncate text-xs text-text-secondary">{x.label}</span>
          </motion.div>
        ))}
      </div>
      <p className="display text-xl font-semibold sm:text-2xl">{headline}</p>
      {outcome && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className={`text-sm font-semibold sm:text-base ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-text-secondary"}`}
        >
          {outcome}
        </motion.p>
      )}
    </motion.div>
  );
}

function soundFor(event: GameEvent, myId: string) {
  switch (event.type) {
    case "roundStart":
      return playSound("shuffle");
    case "chancellorDone":
      return playSound("draw");
    case "roundEnd":
      return playSound("roundWin", 0.3);
    case "gameOver":
      return playSound("gameWin", 0.3);
    case "play": {
      playSound("play");
      const kind = event.card.kind;
      if (event.noEffect) return;
      if (kind === "guard") playSound(event.eliminated ? "eliminate" : "miss", 0.7);
      else if (kind === "priest") playSound("reveal", 0.5);
      else if (kind === "baron") {
        playSound("reveal", 0.45);
        if (event.eliminated) playSound("eliminate", 1.1);
      } else if (kind === "handmaid") playSound("protect", 0.2);
      else if (kind === "prince") {
        playSound("draw", 0.5);
        if (event.eliminated) playSound("eliminate", 0.8);
      } else if (kind === "chancellor") {
        playSound("draw", 0.3);
        playSound("draw", 0.5);
      } else if (kind === "king") playSound("swap", 0.35);
      else if (kind === "princess") playSound("eliminate", 0.4);
      if (event.actor === myId && kind === "priest") playSound("reveal", 0.9);
    }
  }
}
