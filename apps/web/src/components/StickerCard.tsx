import { useState } from "react";
import type { Badge } from "@devfest/shared";

interface Props {
  badge: Badge;
  index?: number;
  /** Small variant for rows of badges; large is the collectible card. */
  size?: "sm" | "lg";
}

/**
 * A collectible sticker. Uses the PNG art in /public/stickers when it exists and
 * falls back to a drawn glyph badge, so the app never shows a broken image if the
 * art has not been dropped in yet.
 */
export default function StickerCard({ badge, index = 0, size = "lg" }: Props) {
  const [broken, setBroken] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const art = badge.art && !broken;

  if (size === "sm") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
        style={{ borderColor: `${badge.color}66`, background: `${badge.color}1a`, color: badge.color }}
      >
        {art ? (
          <picture>
            <source srcSet={badge.art!.replace(/\.png$/, ".webp")} type="image/webp" />
            <img src={badge.art} alt="" className="h-4 w-4 object-contain" onError={() => setBroken(true)} />
          </picture>
        ) : (
          <span className="font-mono">{badge.glyph}</span>
        )}
        {badge.name}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className={`card-3d pop-in w-full text-left ${flipped ? "flipped" : ""}`}
      style={{ animationDelay: `${index * 90}ms` }}
      aria-label={`${badge.name}. ${badge.line}`}
    >
      <div className="card-3d-inner aspect-[3/4]">
        <div
          className="card-face relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border p-3 text-center"
          style={{ borderColor: `${badge.color}55`, background: `linear-gradient(160deg, ${badge.color}22, ${badge.color}08)` }}
        >
          <span
            className={`halo pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              art ? "top-[42%] h-32 w-32" : "top-[38%] h-24 w-24"
            }`}
            style={{ background: `radial-gradient(circle, ${badge.color}55 0%, transparent 70%)` }}
            aria-hidden="true"
          />
          {/* Real art gets most of the card; the glyph fallback stays small and centered. */}
          <div className={`float-soft relative flex items-center justify-center ${art ? "h-[62%] w-[86%]" : "h-16 w-16"}`}>
            {art ? (
              <picture>
                <source srcSet={badge.art!.replace(/\.png$/, ".webp")} type="image/webp" />
                <img
                  src={badge.art}
                  alt=""
                  className="h-full w-full object-contain drop-shadow-lg"
                  loading="lazy"
                  onError={() => setBroken(true)}
                />
              </picture>
            ) : (
              <span className="font-mono text-3xl font-bold" style={{ color: badge.color }}>
                {badge.glyph}
              </span>
            )}
          </div>
          <p className="text-[13px] font-semibold leading-tight" style={{ color: badge.color }}>
            {badge.name}
          </p>
          <p className="text-[10px] uppercase tracking-widest opacity-50">toca</p>
        </div>
        <div
          className="card-face card-back flex flex-col items-center justify-center rounded-2xl border p-4 text-center"
          style={{ borderColor: `${badge.color}55`, background: `${badge.color}14` }}
        >
          <p className="text-[13px] leading-snug">{badge.line}</p>
        </div>
      </div>
    </button>
  );
}
