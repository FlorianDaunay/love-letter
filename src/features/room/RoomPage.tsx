import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { normalizeCode } from "@/net/config";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { useSessionStore } from "@/store/session";
import { errorKey } from "@/ui/errors";
import { useToasts } from "@/ui/Toasts";
import { GameTable } from "../game/GameTable";
import { Lobby } from "./Lobby";

export function RoomPage() {
  const t = useT();
  const code = normalizeCode(useParams().code ?? "");
  const view = useSessionStore((s) => s.view);
  const error = useSessionStore((s) => s.error);
  const push = useToasts((s) => s.push);

  useEffect(() => {
    if (error) push(t(error.key), "danger");
  }, [error, push, t]);

  if (!view?.room || view.room.code !== code) return <JoinForm code={code} />;
  if (view.status === "closed") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="display text-2xl">{t(view.closeReason ?? "closed.left")}</p>
        <Link to="/" className="btn btn-primary mt-6">
          {t("common.back")}
        </Link>
      </div>
    );
  }
  return (
    <>
      {view.status === "migrating" && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-sm text-warning">
          <Loader2 size={16} className="animate-spin" />
          {t("game.migrating")}
        </div>
      )}
      {view.room.game ? <GameTable view={view} /> : <Lobby view={view} />}
    </>
  );
}

/** Opened from an invite link or after a reload: join (or rejoin) by code. */
function JoinForm({ code }: { code: string }) {
  const t = useT();
  const navigate = useNavigate();
  const { name, setName } = useProfile();
  const joinRoom = useSessionStore((s) => s.joinRoom);
  const [password, setPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  const attempt = async (pw: string) => {
    setBusy(true);
    setError(null);
    try {
      await joinRoom(code, pw);
      navigate(`/room/${code}`, { replace: true });
    } catch (e) {
      const key = errorKey(e);
      if (key === "reject.password") setNeedPassword(true);
      if (key !== "reject.password" || pw) setError(key);
    } finally {
      setBusy(false);
    }
  };

  // With a name already known, try right away (no password): rejoining after a reload is instant.
  useEffect(() => {
    if (tried.current || !name.trim()) return;
    tried.current = true;
    void attempt("");
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("home.needName");
    void attempt(password);
  };

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-12">
      <form className="card flex flex-col gap-3 p-6" onSubmit={submit}>
        <h1 className="display text-3xl font-semibold">{t("home.join")}</h1>
        <p className="font-mono text-xl tracking-[0.3em] text-accent">{code}</p>
        <label className="label" htmlFor="join-name">
          {t("home.name")}
        </label>
        <input id="join-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        {needPassword && <input className="input" type="password" autoFocus placeholder={t("home.password")} value={password} onChange={(e) => setPassword(e.target.value)} />}
        {error && <p className="text-sm text-danger">{t(error)}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> {t("home.connecting")}
            </>
          ) : (
            t("home.join")
          )}
        </button>
        <Link to="/" className="btn btn-ghost">
          {t("common.back")}
        </Link>
      </form>
    </div>
  );
}
