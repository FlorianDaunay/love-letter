import { Download, Play, Trash2, Upload, Wifi } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { exportSave, useSaves, type SavedGame } from "@/store/saves";
import { useSessionStore } from "@/store/session";
import { errorKey } from "@/ui/errors";
import { FavorToken } from "@/ui/CardArt";

export function SavesPage() {
  const t = useT();
  const navigate = useNavigate();
  const { saves, remove, importFile } = useSaves();
  const hostRoom = useSessionStore((s) => s.hostRoom);
  const lang = useProfile((s) => s.lang);
  const name = useProfile((s) => s.name);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const resume = async (save: SavedGame, offline: boolean) => {
    if (!name.trim()) return setError("home.needName");
    setError(null);
    try {
      // Offline only makes sense if every other seat is a bot.
      await hostRoom({ resume: save.game, offline, code: offline ? save.code : undefined });
      navigate(`/room/${useSessionStore.getState().session!.room!.code}`);
    } catch (e) {
      setError(errorKey(e));
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!importFile(await file.text())) setError("saves.importFailed");
  };

  const fmt = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="display text-4xl font-semibold">{t("saves.title")}</h1>
        <button className="btn ml-auto" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> {t("saves.import")}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      {error && <p className="mt-3 text-sm text-danger">{t(error)}</p>}
      {saves.length === 0 && <p className="mt-6 text-text-secondary">{t("saves.empty")}</p>}
      <ul className="mt-6 flex flex-col gap-3">
        {saves.map((save) => {
          const humans = save.game.players.filter((p) => !p.isBot).length;
          return (
            <li key={save.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {save.game.players.map((p) => p.name).join(", ")}
                </p>
                <p className="text-xs text-text-muted">
                  {fmt.format(save.savedAt)} · {t("saves.round", { n: save.game.round })}
                </p>
                <div className="mt-1 flex flex-wrap gap-3">
                  {save.game.players.map((p) => (
                    <span key={p.id} className="flex items-center gap-1 text-xs text-text-secondary">
                      <FavorToken size={12} /> {p.tokens} <span className="text-text-muted">{p.name}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {save.game.phase !== "gameOver" && (
                  <>
                    {humans <= 1 && (
                      <button className="btn btn-primary" onClick={() => void resume(save, true)}>
                        <Play size={16} /> {t("saves.resumeSolo")}
                      </button>
                    )}
                    <button className={humans > 1 ? "btn btn-primary" : "btn"} onClick={() => void resume(save, false)}>
                      <Wifi size={16} /> {t("saves.resume")}
                    </button>
                  </>
                )}
                <button className="btn-icon" onClick={() => exportSave(save)} title={t("saves.export")} aria-label={t("saves.export")}>
                  <Download size={16} />
                </button>
                <button className="btn-icon text-danger" onClick={() => remove(save.id)} title={t("saves.delete")} aria-label={t("saves.delete")}>
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
