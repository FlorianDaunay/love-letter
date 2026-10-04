import { create } from "zustand";
import { persist } from "zustand/middleware";
import { readJson, writeJson } from "./storage";

export type Lang = "fr" | "en";

/**
 * The player id lives in sessionStorage: it survives a reload (to reclaim a seat) but two tabs
 * of the same browser are two different players.
 */
function tabPlayerId(): string {
  const existing = readJson<string | null>("love-letter-player-id", null, globalThis.sessionStorage);
  if (existing) return existing;
  const id = `p-${Math.random().toString(36).slice(2, 10)}`;
  writeJson("love-letter-player-id", id, globalThis.sessionStorage);
  return id;
}

interface ProfileState {
  playerId: string;
  name: string;
  lang: Lang;
  sound: boolean;
  volume: number;
  reducedMotion: boolean;
  setName: (name: string) => void;
  setLang: (lang: Lang) => void;
  setSound: (on: boolean) => void;
  setVolume: (v: number) => void;
  setReducedMotion: (on: boolean) => void;
}

const defaultLang: Lang = (globalThis.navigator?.language ?? "fr").toLowerCase().startsWith("fr") ? "fr" : "en";

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      playerId: tabPlayerId(),
      name: "",
      lang: defaultLang,
      sound: true,
      volume: 0.7,
      reducedMotion: false,
      setName: (name) => set({ name: name.slice(0, 24) }),
      setLang: (lang) => set({ lang }),
      setSound: (sound) => set({ sound }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: "love-letter-profile",
      version: 1,
      partialize: ({ name, lang, sound, volume, reducedMotion }) => ({ name, lang, sound, volume, reducedMotion }),
    }
  )
);
