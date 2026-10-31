import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SessionView } from "@/net/session";
import { useT } from "@/i18n";
import { useSessionStore } from "@/store/session";
import { EventStage } from "../game/EventStage";
import { CenterPiles } from "../game/GameTable";
import { playerName, seatColor } from "../game/names";
import { RoundModal } from "../game/RoundModal";
import { Seat } from "../game/Seat";
import { SidePanel } from "../game/SidePanel";
import { ScreenBar } from "./ScreenBar";

/** The shared screen during a game: every seat face down, the staged plays in big. */
export function ProjectorTable({ view }: { view: SessionView }) {
  const t = useT();
  const room = view.room!;
  const game = room.game!;
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session)!;
  const leave = useSessionStore((s) => s.leave);
  const [stageIdle, setStageIdle] = useState(true);
  const away = (id: string) => room.lobby.some((p) => p.id === id && !p.isBot && !p.connected);
  // Around the table: the first half across the top, the rest back along the bottom.
  const half = Math.ceil(game.players.length / 2);
  const top = game.players.slice(0, half);
  const bottom = game.players.slice(half).reverse();
  const acting = game.phase === "turn" || game.phase === "chancellor";
  const showRound = stageIdle && (game.phase === "roundEnd" || game.phase === "gameOver") && !!game.lastRound;

  const seat = (id: string) => {
    const p = game.players.find((x) => x.id === id)!;
    return <Seat key={p.id} game={game} player={p} myId={view.myId} away={away(p.id)} targetable={false} targeted={false} big />;
  };

  return (
    <div className="felt relative flex h-[100dvh] min-h-0 gap-4 overflow-hidden p-4">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <ScreenBar view={view}>
          <span className="display text-3xl font-semibold">{t("game.round", { n: game.round })}</span>
          <span className="badge text-sm">{t("lobby.tokens", { n: game.tokensToWin })}</span>
        </ScreenBar>

        <div className="flex h-12 items-center justify-center">
          <AnimatePresence mode="wait">
            {acting && (
              <motion.p
                key={`${game.current}-${game.phase}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="display flex items-center gap-3 text-3xl font-semibold"
              >
                <span className="h-4 w-4 rounded-pill" style={{ background: seatColor(game, game.current) }} />
                {t(game.phase === "chancellor" ? "projector.chancellor" : "projector.turn", { player: playerName(room, game.current) })}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap justify-center gap-4">{top.map((p) => seat(p.id))}</div>
        <CenterPiles game={game} big />
        <div className="flex flex-wrap justify-center gap-4">{bottom.map((p) => seat(p.id))}</div>

        <EventStage room={room} myId={view.myId} onIdle={setStageIdle} big />
      </div>

      <SidePanel view={view} className="hidden w-96 shrink-0 xl:flex" />

      <AnimatePresence>
        {showRound && (
          <RoundModal room={room} myId={view.myId} isHost={view.isHost} onNext={() => undefined} onLobby={() => session.backToLobby()} onLeave={() => (leave(), navigate("/"))} />
        )}
      </AnimatePresence>
    </div>
  );
}
