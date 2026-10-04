import { useCallback } from "react";
import { useProfile, type Lang } from "@/store/profile";
import { en } from "./en";
import { fr, type MessageKey } from "./fr";

const dictionaries: Record<Lang, Record<MessageKey, string>> = { fr, en };

export type Params = Record<string, string | number>;
export type Translate = (key: MessageKey | string, params?: Params) => string;

export function translate(lang: Lang, key: string, params: Params = {}): string {
  const text = dictionaries[lang][key as MessageKey] ?? dictionaries.fr[key as MessageKey] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}

export function useT(): Translate {
  const lang = useProfile((s) => s.lang);
  return useCallback((key, params) => translate(lang, key, params), [lang]);
}

export type { MessageKey };
