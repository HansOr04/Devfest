/**
 * Layout of the DEVFEST mosaic.
 *
 * The word is drawn with a 5x7 pixel font. Every filled pixel is a "base cell".
 * Each base cell is subdivided into k*k slots depending on how many people joined,
 * so the word is always fully outlined and the fill ratio stays high whether there
 * are 40 people or 4000. Same code runs in the phone, the big screen and the API.
 */

export const WORD = "DEVFEST";

const GLYPHS: Record<string, string[]> = {
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;
export const LETTER_GAP = 1;
export const BASE_COLS = WORD.length * GLYPH_W + (WORD.length - 1) * LETTER_GAP;
export const BASE_ROWS = GLYPH_H;

export interface BaseCell {
  x: number;
  y: number;
  letter: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBaseCells(): BaseCell[] {
  const cells: BaseCell[] = [];
  let x0 = 0;
  for (let i = 0; i < WORD.length; i++) {
    const g = GLYPHS[WORD[i]];
    for (let y = 0; y < GLYPH_H; y++) {
      for (let x = 0; x < GLYPH_W; x++) {
        if (g[y][x] === "1") cells.push({ x: x0 + x, y, letter: i });
      }
    }
    x0 += GLYPH_W + LETTER_GAP;
  }
  // Fill order: roughly left to right like handwriting, with a bit of noise so it
  // never looks like a progress bar. Deterministic so every client agrees.
  const rnd = mulberry32(20261108);
  const keyed = cells.map((c) => ({ c, k: c.x + c.y * 0.12 + rnd() * 4.5 }));
  keyed.sort((a, b) => a.k - b.k);
  return keyed.map((k) => k.c);
}

/** Base cells in fill order. Index in this array is the "base index". */
export const BASE_CELLS: readonly BaseCell[] = buildBaseCells();
export const N_BASE = BASE_CELLS.length;

export const MAX_SUB = 8;

/** Subdivision factor k for a given participant count. Capacity is N_BASE * k * k. */
export function levelFor(count: number): number {
  if (count <= N_BASE) return 1;
  const k = Math.ceil(Math.sqrt(count / N_BASE));
  return Math.min(MAX_SUB, Math.max(1, k));
}

export function capacityFor(k: number): number {
  return N_BASE * k * k;
}

export interface GridLayout {
  k: number;
  cols: number;
  rows: number;
  capacity: number;
}

export function layoutFor(count: number): GridLayout {
  const k = levelFor(count);
  return { k, cols: BASE_COLS * k, rows: BASE_ROWS * k, capacity: capacityFor(k) };
}

export interface CellPos {
  x: number;
  y: number;
  base: number;
  slot: number;
  letter: number;
}

/**
 * Grid position of participant `seq` (1-based, as stored in the DB) at level k.
 * Returns null when the participant does not fit in the current level.
 * Slots inside a base cell fill row-major, so slot 0 is always the top-left corner
 * and early participants stay anchored when the resolution grows.
 */
export function cellFor(seq: number, k: number): CellPos | null {
  const i = seq - 1;
  if (i < 0) return null;
  const base = i % N_BASE;
  const slot = Math.floor(i / N_BASE);
  if (slot >= k * k) return null;
  const b = BASE_CELLS[base];
  return {
    x: b.x * k + (slot % k),
    y: b.y * k + Math.floor(slot / k),
    base,
    slot,
    letter: b.letter,
  };
}

/** Every slot of the silhouette at level k, for painting the empty word. */
export function* allCells(k: number): Generator<{ x: number; y: number; letter: number }> {
  for (const b of BASE_CELLS) {
    for (let sy = 0; sy < k; sy++) {
      for (let sx = 0; sx < k; sx++) {
        yield { x: b.x * k + sx, y: b.y * k + sy, letter: b.letter };
      }
    }
  }
}

/** Inverse lookup: which seq lives at grid (x, y) for level k. Used for tap/hover. */
export function seqAt(x: number, y: number, k: number, count: number): number | null {
  const bx = Math.floor(x / k);
  const by = Math.floor(y / k);
  const base = BASE_CELLS.findIndex((c) => c.x === bx && c.y === by);
  if (base < 0) return null;
  const slot = (y - by * k) * k + (x - bx * k);
  const seq = slot * N_BASE + base + 1;
  return seq <= count ? seq : null;
}
