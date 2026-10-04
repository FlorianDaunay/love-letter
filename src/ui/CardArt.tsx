import { useId } from "react";
import { CARDS, type CardKind } from "@/core/game";
import { useT } from "@/i18n";
import { BACK, BACK_DEEP, CARD_COLORS, GOLD, GOLD_LIGHT, INK, PARCHMENT, PARCHMENT_SHADE } from "./palette";

/** Emblems drawn on a 100x100 grid; `c` is the card colour. */
function Emblem({ kind, c }: { kind: CardKind; c: string }) {
  const ink = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (kind) {
    case "spy":
      return (
        <g {...ink}>
          <path d="M10 44 Q26 26 50 40 Q74 26 90 44" fill="none" strokeWidth={1.5} />
          <path d="M14 46 Q18 31 37 34 Q46 36 50 40 Q54 36 63 34 Q82 31 86 46 Q87 63 68 65 Q56 65 50 55 Q44 65 32 65 Q13 63 14 46 Z" fill={c} />
          <ellipse cx="34" cy="49" rx="9" ry="5.5" fill={PARCHMENT} />
          <ellipse cx="66" cy="49" rx="9" ry="5.5" fill={PARCHMENT} />
          <path d="M50 40 L50 55" stroke={GOLD} strokeWidth={2.5} />
          <path d="M44 72 L50 92 L56 72 Z" fill={GOLD} />
          <circle cx="50" cy="70" r="3" fill={GOLD_LIGHT} />
        </g>
      );
    case "guard":
      return (
        <g {...ink}>
          <rect x="47.5" y="20" width="5" height="72" rx="1.5" fill="#6B4A2B" />
          <path d="M50 4 L56 18 L50 24 L44 18 Z" fill="#C8CDD3" />
          <path d="M53 26 Q76 28 74 50 Q66 42 53 44 Z" fill="#C8CDD3" />
          <path d="M47 28 L34 24 L47 38 Z" fill="#C8CDD3" />
          <rect x="40" y="56" width="20" height="5" rx="2" fill={GOLD} />
          <path d="M30 64 L70 64 L64 86 Q50 94 36 86 Z" fill={c} />
          <path d="M50 66 L50 88 M38 74 L62 74" stroke={GOLD_LIGHT} strokeWidth={2.5} />
        </g>
      );
    case "priest":
      return (
        <g {...ink}>
          <path d="M50 8 Q58 18 50 26 Q42 18 50 8 Z" fill={GOLD} />
          <path d="M50 14 Q53 19 50 23 Q47 19 50 14 Z" fill={GOLD_LIGHT} stroke="none" />
          <rect x="46" y="27" width="8" height="12" rx="1" fill={PARCHMENT} />
          <path d="M50 44 Q34 36 14 40 L14 80 Q34 76 50 86 Z" fill={PARCHMENT} />
          <path d="M50 44 Q66 36 86 40 L86 80 Q66 76 50 86 Z" fill={PARCHMENT} />
          <path d="M50 44 L50 86" />
          <path d="M20 50 Q32 47 44 51 M20 58 Q32 55 44 59 M20 66 Q32 63 44 67 M56 51 Q68 47 80 50 M56 59 Q68 55 80 58 M56 67 Q68 63 80 66" strokeWidth={1.2} fill="none" stroke={c} />
          <path d="M60 40 L60 92 L64 88 L68 92 L68 38" fill={c} />
        </g>
      );
    case "baron":
      return (
        <g {...ink}>
          <rect x="47.5" y="20" width="5" height="62" fill={GOLD} />
          <circle cx="50" cy="16" r="5" fill={GOLD_LIGHT} />
          <path d="M18 30 Q50 22 82 30" fill="none" strokeWidth={4} stroke={INK} />
          <path d="M18 30 Q50 22 82 30" fill="none" strokeWidth={2} stroke={GOLD} />
          <path d="M18 30 L8 56 M18 30 L28 56 M82 30 L72 56 M82 30 L92 56" strokeWidth={1.2} />
          <path d="M5 56 Q18 70 31 56 Z" fill={c} />
          <path d="M69 56 Q82 70 95 56 Z" fill={c} />
          <path d="M32 92 H68 L62 82 H38 Z" fill={c} />
          <circle cx="16" cy="54" r="2.5" fill={GOLD_LIGHT} />
          <circle cx="20" cy="53" r="2.5" fill={GOLD_LIGHT} />
        </g>
      );
    case "handmaid":
      return (
        <g {...ink}>
          <path d="M50 8 L82 20 Q82 62 50 92 Q18 62 18 20 Z" fill={c} />
          <path d="M50 16 L74 25 Q74 58 50 82 Q26 58 26 25 Z" fill="none" stroke={GOLD} strokeWidth={2} />
          <path d="M50 66 C34 55 32 43 39 39 C45 36 50 40 50 45 C50 40 55 36 61 39 C68 43 66 55 50 66 Z" fill={PARCHMENT} />
        </g>
      );
    case "prince":
      return (
        <g {...ink}>
          <path d="M22 62 L28 32 L40 50 L50 24 L60 50 L72 32 L78 62 Z" fill={GOLD} />
          <rect x="22" y="60" width="56" height="13" rx="2" fill={c} />
          <circle cx="28" cy="30" r="4" fill={GOLD_LIGHT} />
          <circle cx="50" cy="22" r="4.5" fill={GOLD_LIGHT} />
          <circle cx="72" cy="30" r="4" fill={GOLD_LIGHT} />
          <circle cx="36" cy="66.5" r="2.8" fill={PARCHMENT} />
          <circle cx="50" cy="66.5" r="3.4" fill="#C0392B" />
          <circle cx="64" cy="66.5" r="2.8" fill={PARCHMENT} />
          <path d="M34 84 H66" strokeWidth={3} stroke={c} />
        </g>
      );
    case "chancellor":
      return (
        <g {...ink}>
          <rect x="24" y="24" width="46" height="56" fill={PARCHMENT} />
          <rect x="18" y="18" width="58" height="10" rx="5" fill={PARCHMENT_SHADE} />
          <rect x="18" y="76" width="58" height="10" rx="5" fill={PARCHMENT_SHADE} />
          <path d="M30 38 H62 M30 46 H58 M30 54 H62 M30 62 H50" stroke={c} strokeWidth={1.6} />
          <circle cx="58" cy="68" r="6" fill="#B03030" />
          <path d="M88 6 Q70 18 58 50 L56 58 L61 51 Q78 26 88 6 Z" fill={c} />
          <path d="M84 12 Q72 26 62 46" stroke={GOLD_LIGHT} strokeWidth={1} fill="none" />
        </g>
      );
    case "king":
      return (
        <g {...ink}>
          <path d="M16 64 L18 28 L34 46 L50 18 L66 46 L82 28 L84 64 Z" fill={GOLD} />
          <path d="M26 58 L27 40 L36 52 L50 30 L64 52 L73 40 L74 58" fill="none" stroke={GOLD_LIGHT} strokeWidth={1.5} />
          <rect x="16" y="62" width="68" height="16" rx="2" fill={c} />
          <circle cx="18" cy="26" r="5" fill={GOLD_LIGHT} />
          <circle cx="50" cy="15" r="5.5" fill={GOLD_LIGHT} />
          <circle cx="82" cy="26" r="5" fill={GOLD_LIGHT} />
          <rect x="45" y="65" width="10" height="10" transform="rotate(45 50 70)" fill="#2E86C1" />
          <circle cx="30" cy="70" r="3.5" fill={PARCHMENT} />
          <circle cx="70" cy="70" r="3.5" fill={PARCHMENT} />
          <path d="M20 86 H80" strokeWidth={3} stroke={GOLD} />
        </g>
      );
    case "countess":
      return (
        <g {...ink}>
          <path d="M50 54 Q45 72 50 94" fill="none" stroke="#3F6B3A" strokeWidth={3} />
          <path d="M49 72 Q34 62 26 70 Q36 80 49 72 Z" fill="#4F7A55" />
          <path d="M51 82 Q66 72 74 80 Q64 90 51 82 Z" fill="#4F7A55" />
          <circle cx="50" cy="34" r="22" fill={c} />
          <path d="M50 34 m-6 0 a6 6 0 1 1 6 6 a11 11 0 0 1 -11 -11 a16 16 0 0 1 16 -16 a19 19 0 0 1 17 17" fill="none" stroke={PARCHMENT} strokeWidth={2} />
          <path d="M30 40 Q38 56 56 55" fill="none" stroke={PARCHMENT} strokeWidth={1.6} />
        </g>
      );
    case "princess":
      return (
        <g {...ink}>
          <path d="M50 92 C22 74 14 56 24 46 C33 38 46 42 50 52 C54 42 67 38 76 46 C86 56 78 74 50 92 Z" fill="#B3263A" />
          <path d="M20 40 L26 20 L37 32 L50 6 L63 32 L74 20 L80 40 Q50 30 20 40 Z" fill={GOLD} />
          <circle cx="26" cy="18" r="3" fill={GOLD_LIGHT} />
          <circle cx="74" cy="18" r="3" fill={GOLD_LIGHT} />
          <path d="M50 26 C46 22 44 18 47 16 C49 15 50 17 50 18 C50 17 51 15 53 16 C56 18 54 22 50 26 Z" fill={PARCHMENT} strokeWidth={1} />
          <path d="M50 78 C38 70 34 62 39 58 C43 55 48 58 50 62 C52 58 57 55 61 58 C66 62 62 70 50 78 Z" fill="none" stroke={GOLD_LIGHT} strokeWidth={1.5} />
        </g>
      );
  }
}

/** Card face as one SVG (250x350): scales crisply at any size. */
export function CardFace({ kind, detailed = false }: { kind: CardKind; detailed?: boolean }) {
  const t = useT();
  const id = useId().replace(/:/g, "");
  const c = CARD_COLORS[kind];
  const value = CARDS[kind].value;
  return (
    <svg viewBox="0 0 250 350" className="block h-full w-full" role="img" aria-label={`${t(`card.${kind}`)} (${value})`}>
      <defs>
        <radialGradient id={`paper-${id}`} cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#FBF6EA" />
          <stop offset="100%" stopColor={PARCHMENT_SHADE} />
        </radialGradient>
        <linearGradient id={`band-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={c} />
          <stop offset="100%" stopColor={c} stopOpacity={0.82} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="250" height="350" rx="18" fill={`url(#paper-${id})`} />
      <rect x="9" y="9" width="232" height="332" rx="12" fill="none" stroke={c} strokeWidth="3" />
      <rect x="15" y="15" width="220" height="320" rx="9" fill="none" stroke={GOLD} strokeWidth="1.2" />
      {/* corner flourishes */}
      {[
        [15, 15, 0],
        [235, 15, 90],
        [235, 335, 180],
        [15, 335, 270],
      ].map(([x, y, r]) => (
        <path key={r} d="M0 22 Q0 0 22 0" transform={`translate(${x} ${y}) rotate(${r})`} fill="none" stroke={GOLD} strokeWidth="2" />
      ))}
      {/* emblem in an arched window */}
      <path d="M45 222 L45 100 Q45 52 125 52 Q205 52 205 100 L205 222 Z" fill={c} fillOpacity={0.1} stroke={c} strokeOpacity={0.5} strokeWidth="1.5" />
      <g transform={detailed ? "translate(62 66) scale(1.26)" : "translate(50 70) scale(1.5)"}>
        <Emblem kind={kind} c={c} />
      </g>
      {/* value medallion */}
      <circle cx="44" cy="46" r="26" fill={c} stroke={GOLD} strokeWidth="3" />
      <circle cx="44" cy="46" r="21" fill="none" stroke={GOLD_LIGHT} strokeWidth="1" />
      <text x="44" y="57" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="32" fill="#FFF8E7">
        {value}
      </text>
      {/* name banner */}
      <path d="M20 230 H230 L222 246 L230 262 H20 L28 246 Z" fill={`url(#band-${id})`} stroke={GOLD} strokeWidth="1.5" />
      <text x="125" y="254" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="26" letterSpacing="1.5" fill="#FFF8E7">
        {t(`card.${kind}`).toUpperCase()}
      </text>
      {detailed ? (
        <foreignObject x="24" y="268" width="202" height="66">
          <div
            style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, lineHeight: 1.25, color: INK, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}
          >
            {t(`effect.${kind}`)}
          </div>
        </foreignObject>
      ) : (
        <g>
          {Array.from({ length: CARDS[kind].count }, (_, i) => (
            <circle key={i} cx={125 + (i - (CARDS[kind].count - 1) / 2) * 14} cy="300" r="4.5" fill={c} stroke={GOLD} strokeWidth="1" />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Card back: a sealed letter on a damask ground. */
export function CardBack() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 250 350" className="block h-full w-full" aria-hidden>
      <defs>
        <pattern id={`damask-${id}`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M18 2 Q24 12 18 18 Q12 12 18 2 Z M18 34 Q12 24 18 18 Q24 24 18 34 Z M2 18 Q12 12 18 18 Q12 24 2 18 Z M34 18 Q24 24 18 18 Q24 12 34 18 Z" fill={GOLD} fillOpacity="0.16" />
        </pattern>
        <radialGradient id={`backg-${id}`} cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor={BACK} />
          <stop offset="100%" stopColor={BACK_DEEP} />
        </radialGradient>
      </defs>
      <rect width="250" height="350" rx="18" fill={`url(#backg-${id})`} />
      <rect width="250" height="350" rx="18" fill={`url(#damask-${id})`} />
      <rect x="10" y="10" width="230" height="330" rx="12" fill="none" stroke={GOLD} strokeWidth="2.5" />
      <rect x="17" y="17" width="216" height="316" rx="8" fill="none" stroke={GOLD} strokeOpacity="0.5" strokeWidth="1" />
      {/* envelope */}
      <g transform="translate(55 120)">
        <rect width="140" height="96" rx="6" fill={PARCHMENT} stroke={GOLD} strokeWidth="2" />
        <path d="M0 6 L70 58 L140 6" fill="none" stroke={PARCHMENT_SHADE} strokeWidth="3" />
        <path d="M0 6 L70 58 L140 6" fill="none" stroke={GOLD} strokeWidth="1.2" />
        <circle cx="70" cy="58" r="20" fill="#9E1B2E" stroke="#6E0F1E" strokeWidth="2" />
        <circle cx="70" cy="58" r="14" fill="none" stroke="#C94458" strokeWidth="1" />
        <path d="M70 68 C60 61 57 54 61 50 C65 47 69 49 70 53 C71 49 75 47 79 50 C83 54 80 61 70 68 Z" fill={GOLD_LIGHT} />
      </g>
      <text x="125" y="275" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontStyle="italic" fontSize="24" fill={GOLD_LIGHT} letterSpacing="2">
        Love Letter
      </text>
    </svg>
  );
}

/** The favor token: a little ruby heart. */
export function FavorToken({ size = 18, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ opacity: dim ? 0.25 : 1 }}>
      <defs>
        <linearGradient id="favor-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F05A6E" />
          <stop offset="1" stopColor="#8E1028" />
        </linearGradient>
      </defs>
      <path d="M12 21 C4 15 2 10 4.5 6.8 C7 4 10.5 5 12 8 C13.5 5 17 4 19.5 6.8 C22 10 20 15 12 21 Z" fill={dim ? "none" : "url(#favor-g)"} stroke={dim ? "currentColor" : "#5E0A18"} strokeWidth="1.2" />
      {!dim && <path d="M7.5 8.5 Q9 7 10.5 8.6" fill="none" stroke="#FFD0D6" strokeWidth="1.2" strokeLinecap="round" />}
    </svg>
  );
}
