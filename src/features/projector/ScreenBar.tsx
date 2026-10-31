import { Expand, LogOut, Shrink, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { SessionView } from "@/net/session";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { useSessionStore } from "@/store/session";

export const joinUrl = (code: string) => `${location.origin}${location.pathname}#/join/${code}`;

/** Top bar of the shared screen: the room code stays visible so late players can still join. */
export function ScreenBar({ view, children }: { view: SessionView; children?: ReactNode }) {
  const t = useT();
  const navigate = useNavigate();
  const leave = useSessionStore((s) => s.leave);
  const { sound, setSound } = useProfile();
  const [full, setFull] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const sync = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
      <div className="ml-auto flex items-center gap-2">
        <span className="badge font-mono text-base tracking-[0.2em]">{view.room!.code}</span>
        <button className="btn-icon" onClick={toggleFull} title={t("projector.fullscreen")} aria-label={t("projector.fullscreen")} aria-pressed={full}>
          {full ? <Shrink size={18} /> : <Expand size={18} />}
        </button>
        <button className="btn-icon" onClick={() => setSound(!sound)} title={t("settings.sound")} aria-label={t("settings.sound")} aria-pressed={sound}>
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          className="btn-icon"
          onClick={() => {
            leave();
            navigate("/");
          }}
          title={t("game.leave")}
          aria-label={t("game.leave")}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
