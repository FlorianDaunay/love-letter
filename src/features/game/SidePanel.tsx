import { useEffect, useRef, useState } from "react";
import { CARDS, CARD_KINDS, unseenCounts } from "@/core/game";
import type { SessionView } from "@/net/session";
import { useT } from "@/i18n";
import { Card } from "@/ui/Card";
import { ChatPanel } from "./ChatPanel";
import { formatLog } from "./names";

type Tab = "log" | "cards" | "chat";

export function SidePanel({ view, className = "" }: { view: SessionView; className?: string }) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("log");
  const tabs: Tab[] = view.offline ? ["log", "cards"] : ["log", "cards", "chat"];
  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div className="flex gap-1 rounded-control border border-border bg-surface p-1" role="tablist">
        {tabs.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${tab === id ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-surface-hover"}`}
          >
            {t(id === "log" ? "game.log" : id === "cards" ? "game.cards" : "game.chat")}
          </button>
        ))}
      </div>
      {tab === "log" && <LogList view={view} />}
      {tab === "cards" && <CardsList view={view} />}
      {tab === "chat" && <ChatPanel view={view} className="flex-1" />}
    </div>
  );
}

function LogList({ view }: { view: SessionView }) {
  const t = useT();
  const room = view.room!;
  const log = room.game?.log ?? [];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [log.length]);
  return (
    <div ref={ref} className="card scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-sm">
      {log.map((entry, i) => (
        <p key={`${entry.at}-${i}`} className={entry.key === "log.roundStart" ? "display mt-2 border-t border-border pt-2 text-base font-semibold first:mt-0 first:border-0 first:pt-0" : entry.key.includes("eliminated") || entry.key === "log.guardHit" ? "text-danger" : entry.key.includes("Won") || entry.key === "log.spyBonus" ? "font-semibold text-accent" : "text-text-secondary"}>
          {formatLog(t, room, entry)}
        </p>
      ))}
    </div>
  );
}

/** Card reference with how many copies are still unseen from my seat: the counting aid. */
function CardsList({ view }: { view: SessionView }) {
  const t = useT();
  const game = view.room!.game!;
  const unseen = unseenCounts(game, view.myId);
  return (
    <div className="card scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
      <p className="label px-1">{t("game.remaining")}</p>
      <ul className="flex flex-col">
        {CARD_KINDS.map((kind) => (
          <li key={kind} className="flex items-center gap-3 rounded-tile px-1 py-1.5 hover:bg-surface-hover">
            <Card kind={kind} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {CARDS[kind].value} · {t(`card.${kind}`)}
              </p>
              <p className="line-clamp-2 text-xs text-text-muted">{t(`effect.${kind}`)}</p>
            </div>
            <span className={`w-10 text-right font-mono text-sm tabular-nums ${unseen[kind] === 0 ? "text-text-muted line-through" : "font-semibold"}`}>
              {unseen[kind]}/{CARDS[kind].count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
