import { GOLD_LIGHT } from "./palette";

/** Wax seal with a heart: the app's mark. */
export function Seal({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        d="M24 3 L28 6 L33 5 L35 9 L40 10 L40 15 L44 18 L42 23 L44 28 L40 31 L40 36 L35 37 L33 42 L28 41 L24 45 L20 41 L15 42 L13 37 L8 36 L8 31 L4 28 L6 23 L4 18 L8 15 L8 10 L13 9 L15 5 L20 6 Z"
        fill="#9E1B2E"
        stroke="#6E0F1E"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="24" r="13" fill="none" stroke="#C94458" strokeWidth="1.2" />
      <path d="M24 31 C17 26 15 21 18 18.5 C20.5 16.5 23 18 24 20.5 C25 18 27.5 16.5 30 18.5 C33 21 31 26 24 31 Z" fill={GOLD_LIGHT} />
    </svg>
  );
}
