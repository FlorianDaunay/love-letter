import { AnimatePresence, motion } from "framer-motion";
import { Bot, Crown, Lock, Play, UserPlus, X } from "lucide-react";
import { MAX_PLAYERS, MIN_PLAYERS, TOKENS_TO_WIN } from "@/core/game";
import { playSound } from "@/audio/sound";
import type { SessionView } from "@/net/session";
import { useT } from "@/i18n";
import { useSessionStore } from "@/store/session";
import { SEAT_COLORS } from "@/ui/palette";
import { Seal } from "@/ui/Seal";
import { joinUrl, ScreenBar } from "./ScreenBar";

/** The shared screen before the game: how to join, in big, and who is seated. */
export function ProjectorLobby({ view }: { view: SessionView }) {
  const t = useT();
  const room = view.room!;
  const session = useSessionStore((s) => s.session)!;
  const seated = room.lobby.filter((p) => p.isBot || p.connected);
  const canStart = seated.length >= MIN_PLAYERS && seated.length <= MAX_PLAYERS;
  const url = joinUrl(room.code);

  return (
    <div className="felt flex min-h-[100dvh] flex-col gap-6 p-4 sm:p-6">
      <ScreenBar view={view}>
        <Seal size={36} />
        <span className="display text-3xl font-semibold">{t("app.title")}</span>
        <span className="badge">{t("projector.screen")}</span>
      </ScreenBar>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="card flex flex-col items-center gap-4 p-8 text-center">
          <h1 className="display text-5xl font-semibold">{t("projector.join")}</h1>
          <p className="text-lg text-text-secondary">{t("projector.joinAt")}</p>
          <p className="break-all font-mono text-xl font-semibold text-accent sm:text-2xl">{url}</p>
          <p className="text-lg text-text-secondary">{t("projector.orCode")}</p>
          <p className="rounded-card bg-accent/10 px-8 py-4 font-mono text-6xl font-bold tracking-[0.3em] text-accent sm:text-7xl">{room.code}</p>
          {room.passwordHash && (
            <span className="badge">
              <Lock size={12} /> {t("lobby.locked")}
            </span>
          )}
        </section>

        <section className="card flex flex-col gap-4 p-6">
          <h2 className="label mb-0 text-base">
            {t("lobby.players")} ({room.lobby.length}/{MAX_PLAYERS})
            {canStart && <span className="ml-2 normal-case tracking-normal">· {t("lobby.tokens", { n: TOKENS_TO_WIN[seated.length] })}</span>}
          </h2>
          {room.lobby.length === 0 && <p className="py-6 text-center text-lg text-text-muted">{t("projector.noPlayers")}</p>}
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {room.lobby.map((p, i) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex items-center gap-3 rounded-tile border border-border bg-canvas/50 px-4 py-3"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-pill text-lg font-bold text-white" style={{ background: SEAT_COLORS[i % SEAT_COLORS.length] }}>
                    {p.isBot ? <Bot size={22} /> : p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-2xl font-semibold">{p.name}</span>
                  {p.id === room.hostId && (
                    <span className="badge">
                      <Crown size={12} /> {t("lobby.host")}
                    </span>
                  )}
                  {p.isBot && <span className="badge">{t("lobby.bot")}</span>}
                  {!p.isBot && !p.connected && <span className="badge text-warning">{t("lobby.away")}</span>}
                  {view.isHost && (
                    <button className="btn-icon ml-auto" title={t("lobby.remove")} aria-label={t("lobby.remove")} onClick={() => session.removePlayer(p.id)}>
                      <X size={16} />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {view.isHost ? (
            <div className="mt-auto flex flex-wrap gap-2">
              <button className="btn" onClick={() => (session.addBot(), playSound("click"))} disabled={room.lobby.length >= MAX_PLAYERS}>
                <UserPlus size={16} /> {t("lobby.addBot")}
              </button>
              <button className="btn btn-primary ml-auto" onClick={() => (session.startGame(), playSound("shuffle"))} disabled={!canStart}>
                <Play size={16} /> {t("lobby.start")}
              </button>
            </div>
          ) : (
            <p className="mt-auto text-sm text-text-secondary">{t("lobby.waitHost")}</p>
          )}
          {!canStart && view.isHost && <p className="text-xs text-text-muted">{t("lobby.needPlayers")}</p>}
        </section>
      </div>
    </div>
  );
}
