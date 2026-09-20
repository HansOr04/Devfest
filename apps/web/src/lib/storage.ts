/**
 * Local persistence for a very long day.
 *
 * The event runs about eight hours and people close the browser, lock the phone and
 * come back much later. Everything a phone needs to render its own state lives here,
 * so reopening the page paints instantly and works even while the wifi is saturated.
 * The server is still the source of truth: these values are a first paint, refreshed
 * as soon as the network answers.
 */

const PREFIX = "devfest.";
const VERSION = 1;
/** Entries older than this are ignored. Comfortably longer than the event. */
const MAX_AGE_MS = 36 * 60 * 60 * 1000;

interface Entry<T> {
  v: number;
  t: number;
  d: T;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (entry.v !== VERSION) return null;
    if (Date.now() - entry.t > MAX_AGE_MS) return null;
    return entry.d;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T): void {
  try {
    const entry: Entry<T> = { v: VERSION, t: Date.now(), d: data };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Private mode or quota exceeded. The app works without the cache.
  }
}

function drop(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const cache = {
  get: read,
  set: write,
  remove: drop,
};

export const CACHE_KEYS = {
  me: "cache.me",
  wall: "cache.wall",
  welcomed: "welcomed",
} as const;

export function hasSeenWelcome(): boolean {
  return read<boolean>(CACHE_KEYS.welcomed) === true;
}

export function markWelcomeSeen(): void {
  write(CACHE_KEYS.welcomed, true);
}
