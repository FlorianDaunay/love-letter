import { useEffect, useState } from "react";
import { playSound } from "@/audio/sound";
import { CARDS, playableCards, validTargets, type CardKind, type GameState } from "@/core/game";
import { useSessionStore } from "@/store/session";

interface Selection {
  uid: number | null;
  target: string | null;
  guess: CardKind | null;
}
const EMPTY: Selection = { uid: null, target: null, guess: null };

/** The card / target / guess being chosen by this seat, shared by the full and compact tables. */
export function usePlay(game: GameState, myId: string) {
  const dispatch = useSessionStore((s) => s.dispatch);
  const [sel, setSel] = useState<Selection>(EMPTY);

  const me = game.players.find((p) => p.id === myId);
  const myTurn = game.phase === "turn" && game.current === myId;
  const playable = playableCards(game, myId);
  const selected = me?.hand.find((c) => c.uid === sel.uid) ?? null;
  const targets = selected ? validTargets(game, myId, selected.kind) : [];
  const needsTarget = !!selected && CARDS[selected.kind].targets !== "none" && targets.length > 0;
  const noTarget = !!selected && CARDS[selected.kind].targets !== "none" && targets.length === 0;
  const needsGuess = selected?.kind === "guard" && !!sel.target;
  const ready = !!selected && (!needsTarget || !!sel.target) && (!needsGuess || !!sel.guess);

  // A new state invalidates a half-made choice.
  useEffect(() => setSel(EMPTY), [game.seq, game.current, game.phase]);

  useEffect(() => {
    if (myTurn) playSound("turn", 0.2);
  }, [myTurn, game.round]);

  const pick = (uid: number) => {
    if (!myTurn || !playable.some((c) => c.uid === uid)) return;
    playSound("click");
    setSel(sel.uid === uid ? EMPTY : { uid, target: null, guess: null });
  };
  const chooseTarget = (id: string) => {
    if (!needsTarget || !targets.includes(id)) return;
    playSound("click");
    setSel({ ...sel, target: id, guess: null });
  };
  const guess = (kind: CardKind) => {
    playSound("click");
    setSel({ ...sel, guess: kind });
  };
  const play = () => {
    if (!ready || !selected) return;
    dispatch({ type: "play", uid: selected.uid, target: sel.target ?? undefined, guess: sel.guess ?? undefined });
    setSel(EMPTY);
  };
  const cancel = () => setSel(EMPTY);
  const canTarget = (id: string) => needsTarget && targets.includes(id);

  return { me, myTurn, playable, sel, selected, needsTarget, noTarget, needsGuess, ready, pick, chooseTarget, canTarget, guess, play, cancel };
}
