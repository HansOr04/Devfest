import { useEffect, useRef } from "react";
import {
  BASE_COLS,
  BASE_ROWS,
  DECADE_COLORS,
  allCells,
  cellFor,
  decadeOf,
  languageById,
  layoutFor,
  seqAt,
  type WallSnapshot,
} from "@devfest/shared";

export interface WallFilter {
  language?: string;
  decade?: string;
}

interface Props {
  snapshot: WallSnapshot | null;
  highlightSeq?: number | null;
  filter?: WallFilter | null;
  onPick?: (seq: number | null) => void;
  className?: string;
  padding?: number;
  showGlyphs?: boolean;
  /** Draw a soft ghost silhouette even when nobody joined */
  ghost?: boolean;
  /** Turn the word 90° so it fills a portrait phone. Disables picking. */
  rotate?: boolean;
}

const EMPTY_FILL = "rgba(255,255,255,0.07)";
const JOINED_FILL = "#6b7280";
const POP_MS = 700;

function ease(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Canvas mosaic of the word DEVFEST. One draw call per cell, no DOM nodes,
 * so 7000 cells repaint in a couple of milliseconds even on a mid-range phone.
 */
export default function WallCanvas({
  snapshot,
  highlightSeq,
  filter,
  onPick,
  className,
  padding = 12,
  showGlyphs = true,
  ghost = true,
  rotate = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bornRef = useRef<Map<number, number>>(new Map());
  const stateRef = useRef({ snapshot, highlightSeq, filter, padding, showGlyphs, ghost, rotate });
  stateRef.current = { snapshot, highlightSeq, filter, padding, showGlyphs, ghost, rotate };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let animatingUntil = 0;
    const born = bornRef.current;

    const draw = (now: number) => {
      const { snapshot, highlightSeq, filter, padding, showGlyphs, ghost, rotate } = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const CW = Math.max(1, Math.floor(rect.width));
      const CH = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== CW * dpr || canvas.height !== CH * dpr) {
        canvas.width = CW * dpr;
        canvas.height = CH * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CW, CH);

      // When rotated the word is laid out in a swapped coordinate space and the whole
      // drawing is turned a quarter turn, so a portrait phone gets a full-bleed DEVFEST.
      const W = rotate ? CH : CW;
      const H = rotate ? CW : CH;
      if (rotate) {
        ctx.translate(CW, 0);
        ctx.rotate(Math.PI / 2);
      }

      const count = snapshot?.count ?? 0;
      const { k, cols, rows } = layoutFor(count);
      const cell = Math.max(1, Math.min((W - padding * 2) / cols, (H - padding * 2) / rows));
      const gridW = cell * cols;
      const gridH = cell * rows;
      const ox = (W - gridW) / 2;
      const oy = (H - gridH) / 2;
      const gap = Math.max(0.5, Math.min(cell * 0.14, 4));
      const r = Math.min(cell * 0.18, 6);

      const rrect = (x: number, y: number, w: number, h: number, rad: number) => {
        const rr = Math.min(rad, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
      };

      // Silhouette: the whole word is always readable.
      if (ghost || count > 0) {
        ctx.fillStyle = EMPTY_FILL;
        for (const c of allCells(k)) {
          rrect(ox + c.x * cell + gap / 2, oy + c.y * cell + gap / 2, cell - gap, cell - gap, r);
          ctx.fill();
        }
      }

      const cards = snapshot?.cards ?? [];
      const glyphOk = showGlyphs && cell >= 24;
      if (glyphOk) {
        ctx.font = `700 ${Math.floor(cell * 0.34)}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
      }

      let highlightPos: { x: number; y: number } | null = null;

      for (const card of cards) {
        const pos = cellFor(card.s, k);
        if (!pos) continue;
        let t0 = born.get(card.s);
        if (t0 === undefined) {
          t0 = now;
          born.set(card.s, now);
        }
        const age = now - t0;
        const pop = age < POP_MS ? ease(age / POP_MS) : 1;
        if (age < POP_MS) animatingUntil = Math.max(animatingUntil, now + (POP_MS - age));

        const lang = languageById(card.l);
        const decade = card.y ? decadeOf(card.y) : null;
        const color = decade ? DECADE_COLORS[decade] : lang ? lang.color : JOINED_FILL;

        const matches =
          !filter ||
          ((filter.language ? card.l === filter.language : true) &&
            (filter.decade ? decade === filter.decade : true));

        const progress = 0.55 + 0.09 * card.p;
        const alpha = (matches ? progress : 0.12) * pop;
        const scale = 0.4 + 0.6 * pop;
        const size = (cell - gap) * scale;
        const cx = ox + pos.x * cell + cell / 2;
        const cy = oy + pos.y * cell + cell / 2;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        rrect(cx - size / 2, cy - size / 2, size, size, r);
        ctx.fill();

        if (glyphOk && lang && matches && pop > 0.9) {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.fillText(lang.glyph, cx, cy + 1);
        }

        if (highlightSeq && card.s === highlightSeq) highlightPos = { x: cx, y: cy };
      }
      ctx.globalAlpha = 1;

      if (highlightSeq) {
        const pos = cellFor(highlightSeq, k);
        if (pos) {
          const cx = ox + pos.x * cell + cell / 2;
          const cy = oy + pos.y * cell + cell / 2;
          const pulse = 0.5 + 0.5 * Math.sin(now / 350);
          const ring = cell * (0.9 + pulse * 0.5);
          ctx.lineWidth = Math.max(2, cell * 0.12);
          ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.45 * pulse})`;
          rrect(cx - ring / 2, cy - ring / 2, ring, ring, r + 3);
          ctx.stroke();
          if (!highlightPos) {
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            rrect(cx - (cell - gap) / 2, cy - (cell - gap) / 2, cell - gap, cell - gap, r);
            ctx.fill();
          }
          animatingUntil = Math.max(animatingUntil, now + 1000);
        }
      }

      if (now < animatingUntil) raf = requestAnimationFrame(draw);
      else raf = 0;
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(canvas);
    schedule();

    const interval = setInterval(schedule, 250);

    return () => {
      ro.disconnect();
      clearInterval(interval);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    // Ensure the very next frame repaints when data changes.
    const canvas = canvasRef.current;
    if (canvas) canvas.dispatchEvent(new Event("repaint"));
  }, [snapshot, highlightSeq, filter]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onPick || rotate) return;
    const { snapshot, padding } = stateRef.current;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const count = snapshot?.count ?? 0;
    const { k, cols, rows } = layoutFor(count);
    const cell = Math.max(1, Math.min((rect.width - padding * 2) / cols, (rect.height - padding * 2) / rows));
    const ox = (rect.width - cell * cols) / 2;
    const oy = (rect.height - cell * rows) / 2;
    const gx = Math.floor((e.clientX - rect.left - ox) / cell);
    const gy = Math.floor((e.clientY - rect.top - oy) / cell);
    if (gx < 0 || gy < 0 || gx >= BASE_COLS * k || gy >= BASE_ROWS * k) return onPick(null);
    onPick(seqAt(gx, gy, k, count));
  };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block", touchAction: "manipulation" }}
      onPointerDown={onPick ? handlePointer : undefined}
      aria-label="Muro DEVFEST formado por las respuestas de la comunidad"
      role="img"
    />
  );
}
