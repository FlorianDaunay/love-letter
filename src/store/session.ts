import { create } from "zustand";
import type { GameAction, GameState } from "@/core/game";
import { Session, type SessionView } from "@/net/session";
import { useProfile } from "./profile";
import { useSaves } from "./saves";

interface SessionState {
  session: Session | null;
  view: SessionView | null;
  /** Last action error (i18n key) with a counter so the same error can show twice. */
  error: { key: string; n: number } | null;
  hostRoom: (options: { password?: string; offline?: boolean; resume?: GameState; code?: string }) => Promise<void>;
  joinRoom: (code: string, password: string) => Promise<void>;
  leave: () => void;
  dispatch: (action: GameAction) => void;
}

let unsubscribers: (() => void)[] = [];
/** Identifies one game for its autosave (a room may play several games). */
let gameKey = "";

function attach(session: Session) {
  unsubscribers.forEach((u) => u());
  unsubscribers = [
    session.subscribe((view) => {
      useSessionStore.setState({ view });
      const game = view.room?.game;
      if (game && view.room) {
        gameKey ||= String(Date.now());
        useSaves.getState().autosave(view.room.code, gameKey, game);
      } else gameKey = "";
    }),
    session.onError((key) => useSessionStore.setState((s) => ({ error: { key, n: (s.error?.n ?? 0) + 1 } }))),
  ];
  useSessionStore.setState({ session, view: session.view(), error: null });
}

const profile = () => {
  const { playerId, name } = useProfile.getState();
  return { playerId, name: name.trim() || "?" };
};

export const useSessionStore = create<SessionState>()((_set, get) => ({
  session: null,
  view: null,
  error: null,
  hostRoom: async (options) => {
    get().session?.leave();
    gameKey = "";
    attach(await Session.host({ profile: profile(), ...options }));
  },
  joinRoom: async (code, password) => {
    get().session?.leave();
    gameKey = "";
    attach(await Session.join(code, password, profile()));
  },
  leave: () => {
    get().session?.leave();
    unsubscribers.forEach((u) => u());
    unsubscribers = [];
    gameKey = "";
    useSessionStore.setState({ session: null, view: null, error: null });
  },
  dispatch: (action) => get().session?.dispatch(action),
}));

// Leaving the page on purpose hands the room over at once instead of after a timeout.
window.addEventListener("pagehide", () => useSessionStore.getState().session?.leave());
