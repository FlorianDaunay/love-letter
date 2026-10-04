import { AnimatePresence, motion } from "framer-motion";
import { create } from "zustand";

interface Toast {
  id: number;
  text: string;
  tone: "info" | "danger" | "success";
}

interface ToastState {
  toasts: Toast[];
  push: (text: string, tone?: Toast["tone"]) => void;
}

let next = 1;

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (text, tone = "info") => {
    const id = next++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
}));

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className={`card px-4 py-2 text-sm shadow-overlay ${t.tone === "danger" ? "text-danger" : t.tone === "success" ? "text-success" : ""}`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
