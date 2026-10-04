import { Gauge } from "lucide-react";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { SPEEDS } from "./pace";

/** Segmented control for the game pace (animations and bots' thinking time). */
export function SpeedPicker({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const { speed, setSpeed } = useProfile();
  return (
    <div className="flex items-center gap-1.5" title={t("settings.speed")}>
      {compact && <Gauge size={16} className="text-text-muted" aria-hidden />}
      <div className="flex rounded-control border border-border bg-surface p-0.5" role="radiogroup" aria-label={t("settings.speed")}>
        {SPEEDS.map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={speed === s}
            onClick={() => setSpeed(s)}
            className={`rounded-control px-2 py-1 text-xs font-medium transition-colors ${compact ? "" : "sm:px-3 sm:text-sm"} ${speed === s ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-surface-hover"}`}
          >
            {t(`speed.${s}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
