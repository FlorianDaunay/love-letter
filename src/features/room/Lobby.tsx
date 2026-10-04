import { AnimatePresence, motion } from "framer-motion";
import { Bot, Copy, Crown, Lock, LogOut, Play, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MAX_PLAYERS, MIN_PLAYERS, TOKENS_TO_WIN } from "@/core/game";
import { playSound } from "@/audio/sound";
import type { SessionView } from "@/net/session";
import { useT } from "@/i18n";
import { useSessionStore } from "@/store/session";
import { SEAT_COLORS } from "@/ui/palette";
import { useToasts } from "@/ui/Toasts";
import { ChatPanel } from "../game/ChatPanel";

export function Lobby({ view }: { view: SessionView }) {
  const t = useT();
  const navigate = useNavigate();
  const room = view.room!;
  const session = useSessionStore((s) => s.session)!;
  const leave = useSessionStore((s) => s.leave);
  const push = useToasts((s) => s.push);
  const seated = room.lobby.filter((p) => p.isBot || p.connected);
  const canStart = seated.length >= MIN_PLAYERS && seated.length <= MAX_PLAYERS;

  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}#/join/${room.code}`;
    try {
      await navigator.clipboard.writeText(url);
      push(t("lobby.copied"), "success");
    } catch {
      push(url);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6 md:grid-cols-[1fr_320px]">
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display text-3xl font-semibold">{t("lobby.title")}</h1>
          {!view.offline && (
            <>
              <span className="rounded-control bg-accent/10 px-3 py-1 font-mono text-xl tracking-[0.3em] text-accent">{room.code}</span>
              {room.passwordHash && (
                <span className="badge" title={t("lobby.locked")}>
                  <Lock size={12} /> {t("lobby.locked")}
                </span>
              )}
              <button className="btn ml-auto" onClick={copyLink}>
                <Copy size={16} /> {t("lobby.copyLink")}
              </button>
            </>
          )}
        </div>

        <h2 className="label mt-6">
          {t("lobby.players")} ({room.lobby.length}/{MAX_PLAYERS})
          {canStart && <span className="ml-2 normal-case tracking-normal">· {t("lobby.tokens", { n: TOKENS_TO_WIN[seated.length] })}</span>}
        </h2>
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {room.lobby.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center gap-3 rounded-tile border border-border bg-canvas/50 px-3 py-2"
              >
                <span className="grid h-9 w-9 place-items-center rounded-pill text-sm font-bold text-white" style={{ background: SEAT_COLORS[i % SEAT_COLORS.length] }}>
                  {p.isBot ? <Bot size={18} /> : p.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="font-medium">{p.name}</span>
                {p.id === view.myId && <span className="text-xs text-text-muted">({t("lobby.you")})</span>}
                {p.id === room.hostId && (
                  <span className="badge">
                    <Crown size={12} /> {t("lobby.host")}
                  </span>
                )}
                {p.isBot && <span className="badge">{t("lobby.bot")}</span>}
                {!p.isBot && !p.connected && <span className="badge text-warning">{t("lobby.away")}</span>}
                {view.isHost && p.id !== view.myId && (
                  <button className="btn-icon ml-auto" title={t("lobby.remove")} aria-label={t("lobby.remove")} onClick={() => session.removePlayer(p.id)}>
                    <X size={16} />
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          {view.isHost ? (
            <>
              <button className="btn" onClick={() => (session.addBot(), playSound("click"))} disabled={room.lobby.length >= MAX_PLAYERS}>
                <UserPlus size={16} /> {t("lobby.addBot")}
              </button>
              <button className="btn btn-primary" onClick={() => (session.startGame(), playSound("shuffle"))} disabled={!canStart}>
                <Play size={16} /> {t("lobby.start")}
              </button>
            </>
          ) : (
            <p className="text-sm text-text-secondary">{t("lobby.waitHost")}</p>
          )}
          <button
            className="btn btn-ghost ml-auto"
            onClick={() => {
              leave();
              navigate("/");
            }}
          >
            <LogOut size={16} /> {t("lobby.leave")}
          </button>
        </div>
        {!canStart && view.isHost && <p className="mt-2 text-xs text-text-muted">{t("lobby.needPlayers")}</p>}
      </section>
      {!view.offline && <ChatPanel view={view} className="h-[420px]" />}
    </div>
  );
}
