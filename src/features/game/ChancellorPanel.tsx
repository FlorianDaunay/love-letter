import { motion } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { playSound } from "@/audio/sound";
import type { Card as GameCard } from "@/core/game";
import { useT } from "@/i18n";
import { Card } from "@/ui/Card";

/** Keep one card; the others go under the deck in the chosen order (first = deepest). */
export function ChancellorPanel({ hand, onConfirm }: { hand: GameCard[]; onConfirm: (uids: number[]) => void }) {
  const t = useT();
  const [keep, setKeep] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const rest = keep === null ? [] : order.length ? order : hand.filter((c) => c.uid !== keep).map((c) => c.uid);
  const byUid = (uid: number) => hand.find((c) => c.uid === uid)!;

  const choose = (uid: number) => {
    playSound("click");
    setKeep(uid);
    setOrder(hand.filter((c) => c.uid !== uid).map((c) => c.uid));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div initial={{ y: 30, scale: 0.95 }} animate={{ y: 0, scale: 1 }} className="card w-full max-w-2xl p-5 shadow-overlay">
        <h2 className="display text-3xl font-semibold">{t("game.chancellorTitle")}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t("game.chancellorHint")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {hand.map((c) => (
            <Card key={c.uid} kind={c.kind} size="lg" detailed selected={keep === c.uid} dimmed={keep !== null && keep !== c.uid} onClick={() => choose(c.uid)} />
          ))}
        </div>
        {keep !== null && rest.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4">
            <span className="label mb-0">{t("game.bottom")}</span>
            {rest.map((uid, i) => (
              <div key={uid} className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-pill bg-surface-hover text-xs font-bold">{i + 1}</span>
                <Card kind={byUid(uid).kind} size="sm" />
              </div>
            ))}
            {rest.length > 1 && (
              <button className="btn-icon" onClick={() => setOrder([...rest].reverse())} aria-label="swap">
                <ArrowLeftRight size={16} />
              </button>
            )}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button className="btn btn-primary" disabled={keep === null} onClick={() => onConfirm(rest)}>
            {t("game.confirm")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
