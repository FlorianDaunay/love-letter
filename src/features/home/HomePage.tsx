import { motion } from "framer-motion";
import { Bot, LogIn, Minus, Plus, Users } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/audio/sound";
import { normalizeCode } from "@/net/config";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { useSessionStore } from "@/store/session";
import { Card } from "@/ui/Card";
import { errorKey } from "@/ui/errors";

function Panel({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-tile bg-accent/10 text-accent">{icon}</span>
        <h2 className="display text-2xl font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-text-secondary">{hint}</p>
      {children}
    </section>
  );
}

export function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const { name, setName } = useProfile();
  const hostRoom = useSessionStore((s) => s.hostRoom);
  const joinRoom = useSessionStore((s) => s.joinRoom);
  const [bots, setBots] = useState(2);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guard = async (what: string, fn: () => Promise<void>) => {
    if (!name.trim()) return setError("home.needName");
    setError(null);
    setBusy(what);
    playSound("click");
    try {
      await fn();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(null);
    }
  };

  const solo = () =>
    guard("solo", async () => {
      await hostRoom({ offline: true });
      const session = useSessionStore.getState().session!;
      for (let i = 0; i < bots; i++) session.addBot();
      session.startGame();
      navigate(`/room/${session.room!.code}`);
    });

  const create = () =>
    guard("create", async () => {
      await hostRoom({ password });
      navigate(`/room/${useSessionStore.getState().session!.room!.code}`);
    });

  const join = (e: FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(code);
    if (!c) return;
    void guard("join", async () => {
      await joinRoom(c, joinPassword);
      navigate(`/room/${c}`);
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="display text-5xl font-semibold leading-tight sm:text-7xl"
          >
            {t("app.title")}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-3 text-lg italic text-text-secondary display sm:text-2xl">
            {t("app.tagline")}
          </motion.p>
          <div className="mt-8 max-w-sm">
            <label className="label" htmlFor="name">
              {t("home.name")}
            </label>
            <input id="name" className="input text-base" value={name} placeholder={t("home.namePlaceholder")} onChange={(e) => setName(e.target.value)} maxLength={24} />
          </div>
          {error && <p className="mt-3 text-sm text-danger">{t(error)}</p>}
        </div>
        <HeroCards />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Panel icon={<Bot size={20} />} title={t("home.solo")} hint={t("home.soloHint")}>
          <div className="flex items-center justify-between">
            <span className="label mb-0">{t("home.bots")}</span>
            <div className="flex items-center gap-2">
              <button className="btn-icon" onClick={() => setBots(Math.max(1, bots - 1))} aria-label="-">
                <Minus size={16} />
              </button>
              <span className="w-6 text-center text-lg font-semibold tabular-nums">{bots}</span>
              <button className="btn-icon" onClick={() => setBots(Math.min(5, bots + 1))} aria-label="+">
                <Plus size={16} />
              </button>
            </div>
          </div>
          <button className="btn btn-primary mt-auto" onClick={solo} disabled={!!busy}>
            {busy === "solo" ? t("home.connecting") : t("home.play")}
          </button>
        </Panel>

        <Panel icon={<Users size={20} />} title={t("home.create")} hint={t("home.createHint")}>
          <input className="input" type="password" autoComplete="new-password" placeholder={t("home.password")} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn btn-primary mt-auto" onClick={create} disabled={!!busy}>
            {busy === "create" ? t("home.connecting") : t("home.create")}
          </button>
        </Panel>

        <Panel icon={<LogIn size={20} />} title={t("home.join")} hint={t("home.joinHint")}>
          <form className="flex flex-1 flex-col gap-3" onSubmit={join}>
            <input
              className="input font-mono uppercase tracking-[0.3em]"
              placeholder={t("home.code")}
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              aria-label={t("home.code")}
            />
            <input className="input" type="password" autoComplete="off" placeholder={t("home.password")} value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} />
            <button className="btn btn-primary mt-auto" type="submit" disabled={!!busy || !code}>
              {busy === "join" ? t("home.connecting") : t("home.join")}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function HeroCards() {
  const cards = [
    { kind: "king" as const, rotate: -14, x: -70, delay: 0.1 },
    { kind: "princess" as const, rotate: 0, x: 0, delay: 0.25 },
    { kind: "countess" as const, rotate: 14, x: 70, delay: 0.4 },
  ];
  return (
    <div className="relative mx-auto flex h-64 w-full max-w-md items-center justify-center sm:h-80" aria-hidden>
      {cards.map((c, i) => (
        <motion.div
          key={c.kind}
          className="absolute"
          initial={{ opacity: 0, y: 0, rotate: 0, x: 0 }}
          animate={{ opacity: 1, y: [0, -6, 0], rotate: c.rotate, x: c.x }}
          transition={{
            opacity: { delay: c.delay, duration: 0.4 },
            x: { delay: c.delay, type: "spring", stiffness: 120, damping: 14 },
            rotate: { delay: c.delay, type: "spring", stiffness: 120, damping: 14 },
            y: { delay: c.delay + 0.6, duration: 4 + i, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{ zIndex: i === 1 ? 2 : 1 }}
        >
          <Card kind={c.kind} size="lg" />
        </motion.div>
      ))}
    </div>
  );
}
