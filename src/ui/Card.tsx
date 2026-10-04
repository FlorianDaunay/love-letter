import { motion } from "framer-motion";
import type { CardKind } from "@/core/game";
import { CardBack, CardFace } from "./CardArt";

export type CardSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<CardSize, string> = {
  xs: "w-8 sm:w-10",
  sm: "w-12 sm:w-14",
  md: "w-[4.5rem] sm:w-24",
  lg: "w-28 sm:w-36",
  xl: "w-44 sm:w-56",
};

interface CardProps {
  /** Unique card id: the same card animates from place to place (deck, hand, discard). */
  uid?: number;
  /** null: face down. */
  kind: CardKind | null;
  size?: CardSize;
  detailed?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  glow?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
  /** Tilt in degrees, for fanned piles. */
  rotate?: number;
}

export function Card({ uid, kind, size = "md", detailed, selected, dimmed, glow, onClick, title, className = "", rotate = 0 }: CardProps) {
  const interactive = !!onClick;
  return (
    <motion.div
      layoutId={uid !== undefined ? `card-${uid}` : undefined}
      layout={uid !== undefined ? "position" : undefined}
      initial={false}
      animate={{ y: selected ? -18 : 0, rotate, scale: selected ? 1.04 : 1 }}
      whileHover={interactive ? { y: selected ? -22 : -8 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onClick={onClick}
      title={title}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick?.()) : undefined}
      className={`relative shrink-0 ${SIZES[size]} aspect-[5/7] ${interactive ? "cursor-pointer" : ""} ${className}`}
      style={{ perspective: 900 }}
    >
      <motion.div
        className="flip relative h-full w-full"
        initial={false}
        animate={{ rotateY: kind ? 0 : 180 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className={`flip-face overflow-hidden rounded-[9%/6.5%] transition-[filter,box-shadow] duration-300 ${dimmed ? "grayscale-[0.7] brightness-[0.75]" : ""}`}
          style={{
            boxShadow: selected || glow ? "0 0 0 3px rgb(var(--color-accent)), 0 12px 28px -8px rgb(0 0 0 / 0.55)" : "0 6px 16px -6px rgb(0 0 0 / 0.45), 0 1px 2px rgb(0 0 0 / 0.25)",
          }}
        >
          {kind && <CardFace kind={kind} detailed={detailed} />}
        </div>
        <div className="flip-face flip-back overflow-hidden rounded-[9%/6.5%]" style={{ boxShadow: "0 6px 16px -6px rgb(0 0 0 / 0.45), 0 1px 2px rgb(0 0 0 / 0.25)" }}>
          <CardBack />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Empty card-sized slot (dashed outline). */
export function CardSlot({ size = "md", label }: { size?: CardSize; label?: string }) {
  return (
    <div className={`${SIZES[size]} aspect-[5/7] grid place-items-center rounded-[9%/6.5%] border-2 border-dashed border-border text-[10px] text-text-muted`}>
      {label}
    </div>
  );
}
