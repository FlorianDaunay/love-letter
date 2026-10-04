import { motion } from "framer-motion";
import { CARDS, CARD_KINDS } from "@/core/game";
import { useT } from "@/i18n";
import { Card } from "@/ui/Card";

export function RulesPage() {
  const t = useT();
  const sections = [
    ["rules.goal", "rules.goalText"],
    ["rules.setup", "rules.setupText"],
    ["rules.turn", "rules.turnText"],
    ["rules.end", "rules.endText"],
  ] as const;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="display text-4xl font-semibold">{t("rules.title")}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {sections.map(([title, text]) => (
          <section key={title} className="card p-5">
            <h2 className="display text-2xl font-semibold">{t(title)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t(text)}</p>
          </section>
        ))}
      </div>
      <h2 className="display mt-10 text-3xl font-semibold">{t("rules.deck")}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CARD_KINDS.map((kind, i) => (
          <motion.div
            key={kind}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 5) * 0.05 }}
            className="flex flex-col items-center gap-1"
          >
            <Card kind={kind} size="lg" detailed />
            <span className="text-xs text-text-muted">× {CARDS[kind].count}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
