import { Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { playSound } from "@/audio/sound";
import type { SessionView } from "@/net/session";
import { useT } from "@/i18n";
import { useSessionStore } from "@/store/session";
import { playerName, seatColor } from "./names";

export function ChatPanel({ view, className = "" }: { view: SessionView; className?: string }) {
  const t = useT();
  const room = view.room!;
  const session = useSessionStore((s) => s.session);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(room.chat.at(-1)?.id);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    const last = room.chat.at(-1);
    if (last && last.id !== lastId.current && last.playerId !== view.myId) playSound("chat");
    lastId.current = last?.id;
  }, [room.chat, view.myId]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    session?.chat(text);
    setText("");
  };

  return (
    <section className={`card flex min-h-0 flex-col ${className}`}>
      <h2 className="label border-b border-border px-4 py-3">{t("game.chat")}</h2>
      <div ref={listRef} className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto px-4 py-3 text-sm">
        {room.chat.map((m) => (
          <p key={m.id}>
            <span className="font-semibold" style={{ color: seatColor(room.game, m.playerId) }}>
              {playerName(room, m.playerId)}
            </span>{" "}
            <span className="text-text-secondary">{m.text}</span>
          </p>
        ))}
      </div>
      <form className="flex gap-2 border-t border-border p-2" onSubmit={send}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("game.chatPlaceholder")} maxLength={300} />
        <button className="btn-icon shrink-0" aria-label={t("game.send")} disabled={!text.trim()}>
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
