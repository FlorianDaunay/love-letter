import { Check } from "lucide-react";
import { playSound } from "@/audio/sound";
import { themes, themeToStyle, useActiveTheme, useThemeStore } from "@/themes";
import { useT } from "@/i18n";
import { useProfile, type Lang } from "@/store/profile";

const LANGS: { id: Lang; label: string }[] = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
];

export function SettingsPage() {
  const t = useT();
  const profile = useProfile();
  const active = useActiveTheme();
  const followSystem = useThemeStore((s) => s.followSystem);
  const selectTheme = useThemeStore((s) => s.selectTheme);
  const setFollowSystem = useThemeStore((s) => s.setFollowSystem);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="display text-4xl font-semibold">{t("settings.title")}</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="card flex flex-col gap-4 p-5">
          <div>
            <span className="label">{t("settings.language")}</span>
            <div className="flex gap-2">
              {LANGS.map((l) => (
                <button key={l.id} className={`btn ${profile.lang === l.id ? "btn-primary" : ""}`} onClick={() => profile.setLang(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t("settings.sound")}</span>
            <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--color-accent))]" checked={profile.sound} onChange={(e) => profile.setSound(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t("settings.volume")}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={profile.volume}
              disabled={!profile.sound}
              onChange={(e) => profile.setVolume(Number(e.target.value))}
              onPointerUp={() => playSound("reveal")}
              className="w-40 accent-[rgb(var(--color-accent))]"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t("settings.motion")}</span>
            <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--color-accent))]" checked={profile.reducedMotion} onChange={(e) => profile.setReducedMotion(e.target.checked)} />
          </label>
          <p className="mt-auto text-xs text-text-muted">{t("settings.version", { v: __APP_VERSION__ })}</p>
        </section>

        <section className="card flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="label mb-0">{t("settings.theme")}</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[rgb(var(--color-accent))]" checked={followSystem} onChange={(e) => setFollowSystem(e.target.checked)} />
              {t("settings.followSystem")}
            </label>
          </div>
          <div className="scrollbar-thin grid max-h-[28rem] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                style={themeToStyle(theme)}
                onClick={() => selectTheme(theme.id)}
                className={`relative flex flex-col gap-1.5 rounded-tile border bg-canvas p-2 text-left text-text-primary ${active.id === theme.id ? "border-accent ring-2 ring-accent" : "border-border"}`}
                title={theme.description}
              >
                <span className="flex gap-1">
                  <span className="h-4 flex-1 rounded-control bg-surface border border-border" />
                  <span className="h-4 w-4 rounded-pill bg-accent" />
                </span>
                <span className="truncate font-sans text-xs font-medium">{theme.name}</span>
                {active.id === theme.id && <Check size={14} className="absolute right-1.5 top-1.5 text-accent" />}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
