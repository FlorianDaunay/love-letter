import { MotionConfig } from "framer-motion";
import { BookOpen, Archive, Settings, Volume2, VolumeX } from "lucide-react";
import { useEffect } from "react";
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { unlockAudio } from "@/audio/sound";
import { HomePage } from "@/features/home/HomePage";
import { RoomPage } from "@/features/room/RoomPage";
import { RulesPage } from "@/features/rules/RulesPage";
import { SavesPage } from "@/features/saves/SavesPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { Seal } from "@/ui/Seal";
import { Toasts } from "@/ui/Toasts";

function Header() {
  const t = useT();
  const { sound, setSound } = useProfile();
  const location = useLocation();
  const inGame = location.pathname.startsWith("/room");
  return (
    <header className={`sticky top-0 z-30 border-b border-border bg-canvas/80 backdrop-blur ${inGame ? "hidden sm:block" : ""}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Seal size={30} />
          <span className="display text-2xl font-semibold">{t("app.title")}</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          <Link to="/rules" className="btn-icon" title={t("home.rules")} aria-label={t("home.rules")}>
            <BookOpen size={18} />
          </Link>
          <Link to="/saves" className="btn-icon" title={t("home.saves")} aria-label={t("home.saves")}>
            <Archive size={18} />
          </Link>
          <Link to="/settings" className="btn-icon" title={t("home.settings")} aria-label={t("home.settings")}>
            <Settings size={18} />
          </Link>
          <button className="btn-icon" onClick={() => setSound(!sound)} title={t("settings.sound")} aria-label={t("settings.sound")} aria-pressed={sound}>
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </nav>
      </div>
    </header>
  );
}

export function App() {
  const reducedMotion = useProfile((s) => s.reducedMotion);
  const lang = useProfile((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }, []);
  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
      <HashRouter>
        <div className="flex min-h-[100dvh] flex-col">
          <Header />
          <main className="flex flex-1 flex-col">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/room/:code" element={<RoomPage />} />
              <Route path="/join/:code" element={<RoomPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/saves" element={<SavesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Toasts />
      </HashRouter>
    </MotionConfig>
  );
}
