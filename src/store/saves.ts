import { create } from "zustand";
import { normalizeGame, type GameState } from "@/core/game";
import { readJson, writeJson } from "./storage";

const KEY = "love-letter-saves";
const MAX_SAVES = 8;

export interface SavedGame {
  /** One save per room: autosaves of the same room replace each other. */
  id: string;
  code: string;
  savedAt: number;
  game: GameState;
}

interface SavesState {
  saves: SavedGame[];
  autosave: (code: string, startedAt: string, game: GameState) => void;
  remove: (id: string) => void;
  importFile: (text: string) => SavedGame | null;
}

const load = (): SavedGame[] =>
  readJson<SavedGame[]>(KEY, [])
    .map((s) => ({ ...s, game: normalizeGame(s.game)! }))
    .filter((s) => s.game);

export const useSaves = create<SavesState>()((set, get) => {
  const persist = (saves: SavedGame[]) => {
    // On quota errors, drop the oldest saves until it fits.
    let list = saves;
    while (!writeJson(KEY, list) && list.length > 1) list = list.slice(0, -1);
    set({ saves: list });
  };
  return {
    saves: load(),
    autosave: (code, startedAt, game) => {
      const id = `${code}-${startedAt}`;
      const entry: SavedGame = { id, code, savedAt: Date.now(), game: { ...game, events: [] } };
      persist([entry, ...get().saves.filter((s) => s.id !== id)].slice(0, MAX_SAVES));
    },
    remove: (id) => persist(get().saves.filter((s) => s.id !== id)),
    importFile: (text) => {
      try {
        const raw = JSON.parse(text);
        const game = normalizeGame(raw.game ?? raw);
        if (!game) return null;
        const entry: SavedGame = { id: `import-${Date.now()}`, code: raw.code ?? "IMPORT", savedAt: Date.now(), game };
        persist([entry, ...get().saves].slice(0, MAX_SAVES));
        return entry;
      } catch {
        return null;
      }
    },
  };
});

export function exportSave(save: SavedGame) {
  const blob = new Blob([JSON.stringify(save, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `love-letter-${save.code}-${new Date(save.savedAt).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
