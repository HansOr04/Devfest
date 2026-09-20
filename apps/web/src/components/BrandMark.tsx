import { useState } from "react";
import { BRAND_SEQUENCE, EVENT } from "@devfest/shared";

/**
 * GDG Quito lockup. Drop the real logo at /public/brand/gdg-quito.png and it
 * replaces the four dots; until then the dots stand in, so nothing ever breaks.
 */
export default function BrandMark({ className = "", size = 28 }: { className?: string; size?: number }) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label={EVENT.chapter}>
        {BRAND_SEQUENCE.map((c) => (
          <span key={c} className="rounded-full" style={{ background: c, width: size / 4, height: size / 4 }} />
        ))}
      </span>
    );
  }

  return (
    <img
      src="/brand/gdg-quito.png"
      alt={EVENT.chapter}
      className={`object-contain ${className}`}
      style={{ height: size }}
      onError={() => setBroken(true)}
    />
  );
}
