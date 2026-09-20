import type { CardDetail, Participant, PublicState, StationId, WallSnapshot } from "@devfest/shared";
import { cache, CACHE_KEYS } from "./storage";

const TOKEN_KEY = "devfest.token";
const ADMIN_KEY = "devfest.admin";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t: string) {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* private mode, ignore */
  }
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_KEY);
}

export function setAdminToken(t: string) {
  sessionStorage.setItem(ADMIN_KEY, t);
}

export interface EchoItem {
  seq: number;
  language?: string;
  year?: number;
  text: string;
}

export interface EchoResponse {
  sameLanguage: number;
  sameYear: number;
  /** How many people already answered this same station. */
  answered: number;
  /** Only for the three writing stations; the choice stations have nothing to echo yet. */
  echoes: EchoItem[];
  /** Most picked languages so far. Only for the language station. */
  top: { id: string; n: number }[];
  /** Span of years in the room. Only for the year station. */
  oldest: { year: number; newest: number; total: number; before: number } | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers["content-type"] = "application/json";
  const token = getToken();
  if (token) headers["x-participant-token"] = token;
  if (admin) headers["x-admin-token"] = getAdminToken() ?? "";
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) msg = data.error;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

export const api = {
  async join(): Promise<Participant> {
    const p = await request<Participant>("/api/join", { method: "POST" });
    setToken(p.token);
    cache.set(CACHE_KEYS.me, p);
    return p;
  },
  async me(): Promise<Participant> {
    const p = await request<Participant>("/api/me");
    cache.set(CACHE_KEYS.me, p);
    return p;
  },
  /** Last known participant, for painting before the network answers. */
  cachedMe: (): Participant | null => {
    const p = cache.get<Participant>(CACHE_KEYS.me);
    return p && p.token === getToken() ? p : null;
  },
  state: () => request<PublicState>("/api/state"),
  async answer(station: StationId, value: string) {
    const res = await request<{ participant: Participant; fact?: string }>(`/api/answers/${station}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
    cache.set(CACHE_KEYS.me, res.participant);
    return res;
  },
  wall: () => request<WallSnapshot>("/api/wall"),
  echo: (station: StationId, params: { language?: string; year?: string; seq?: number }) => {
    const qs = new URLSearchParams();
    if (params.language) qs.set("language", params.language);
    if (params.year) qs.set("year", params.year);
    if (params.seq) qs.set("seq", String(params.seq));
    return request<EchoResponse>(`/api/echo/${station}?${qs.toString()}`);
  },
  card: (seq: number) => request<CardDetail>(`/api/cards/${seq}`),
  quotes: (limit = 30) => request<CardDetail[]>(`/api/quotes?limit=${limit}`),
  stats: () =>
    request<{
      languages: { id: string; n: number }[];
      years: { year: number; n: number }[];
      completed: Record<StationId, number>;
    }>("/api/stats"),

  admin: {
    overview: () =>
      request<{
        total: number;
        hidden: number;
        done: number;
        perStation: Record<StationId, number>;
        topLanguages: { id: string; n: number }[];
        recent: (CardDetail & { hidden: boolean; updatedAt: string })[];
      }>("/api/admin/overview", {}, true),
    setStation: (id: StationId, open: boolean) =>
      request(`/api/admin/stations/${id}`, { method: "POST", body: JSON.stringify({ open }) }, true),
    advanceTo: (id: StationId) => request(`/api/admin/stations/advance-to/${id}`, { method: "POST" }, true),
    hide: (seq: number, hidden: boolean) =>
      request(`/api/admin/cards/${seq}/hide`, { method: "POST", body: JSON.stringify({ hidden }) }, true),
    cards: (before?: number) =>
      request<(CardDetail & { hidden: boolean })[]>(
        `/api/admin/cards?limit=100${before ? `&before=${before}` : ""}`,
        {},
        true,
      ),
  },
};
