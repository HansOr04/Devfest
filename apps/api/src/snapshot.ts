import type { StationState, WallCard, WallSnapshot } from "@devfest/shared";
import { STATION_IDS } from "@devfest/shared";
import { sql } from "./db.ts";
import { env } from "./env.ts";

/**
 * The wall snapshot is the single most requested object during the event.
 * It is rebuilt at most once per interval, only when something changed,
 * and the same serialized string is handed to every HTTP and WebSocket client.
 * 4000 people submitting in the same minute produce ~30 rebuilds, not 4000.
 */

let dirty = true;
let current: WallSnapshot = { count: 0, cards: [], stations: [], generatedAt: new Date(0).toISOString() };
let serialized = JSON.stringify(current);
let version = 0;
const listeners = new Set<(json: string, version: number) => void>();

export function markDirty() {
  dirty = true;
}

export function getSnapshot() {
  return { snapshot: current, json: serialized, version };
}

export function onSnapshot(fn: (json: string, version: number) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function loadStations(): Promise<StationState[]> {
  const rows = await sql<{ id: string; open: boolean; openedAt: Date | null }[]>`
    select id, open, opened_at from stations
  `;
  return STATION_IDS.map((id) => {
    const r = rows.find((x) => x.id === id);
    return { id, open: r?.open ?? false, openedAt: r?.openedAt?.toISOString() ?? null };
  });
}

let rebuilding = false;

export async function rebuild(force = false) {
  if ((!dirty && !force) || rebuilding) return false;
  rebuilding = true;
  try {
    dirty = false;
    const [rows, stations, maxRow] = await Promise.all([
      sql<{ seq: string; language: string | null; year: number | null; p: number }[]>`
        select seq, language, year,
          (language is not null)::int + (year is not null)::int + (built is not null)::int
          + (broke is not null)::int + (advice is not null)::int as p
        from participants
        where hidden = false
        order by seq
      `,
      loadStations(),
      sql<{ max: string | null }[]>`select max(seq)::text as max from participants`,
    ]);
    const cards: WallCard[] = rows.map((r) => {
      const c: WallCard = { s: Number(r.seq), p: Number(r.p) };
      if (r.language) c.l = r.language;
      if (r.year) c.y = r.year;
      return c;
    });
    current = {
      count: Number(maxRow[0]?.max ?? 0),
      cards,
      stations,
      generatedAt: new Date().toISOString(),
    };
    serialized = JSON.stringify(current);
    version++;
    for (const fn of listeners) fn(serialized, version);
    return true;
  } finally {
    rebuilding = false;
  }
}

export function startSnapshotLoop() {
  let running = false;
  let ticks = 0;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      // Every ~10s rebuild even if nothing was flagged, so out-of-band DB edits
      // (moderation by SQL, seeds, a second API instance) still reach the screens.
      ticks++;
      await rebuild(ticks % 5 === 0);
    } catch (err) {
      console.error("snapshot rebuild failed", err);
      dirty = true;
    } finally {
      running = false;
    }
  };
  void rebuild(true);
  return setInterval(tick, env.snapshotIntervalMs);
}
