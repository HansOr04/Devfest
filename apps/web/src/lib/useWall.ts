import { useEffect, useRef, useState } from "react";
import type { WallSnapshot } from "@devfest/shared";
import { api } from "./api";
import { cache, CACHE_KEYS } from "./storage";

/**
 * Live wall snapshot. WebSocket first, HTTP polling as a safety net.
 * Both paths produce the same JSON so consumers never care which one is active.
 */
export function useWall(pollMs = 4000) {
  // Start from the last snapshot this device saw, so the wall is never blank on reopen.
  const [snapshot, setSnapshot] = useState<WallSnapshot | null>(() =>
    cache.get<WallSnapshot>(CACHE_KEYS.wall),
  );
  const [live, setLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const lastSave = useRef(0);

  // Persisting every frame would thrash localStorage; once a minute is plenty.
  const remember = (s: WallSnapshot) => {
    const now = Date.now();
    if (now - lastSave.current < 60_000) return;
    lastSave.current = now;
    cache.set(CACHE_KEYS.wall, s);
  };

  useEffect(() => {
    let closed = false;
    let retry = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 1000;
        setLive(true);
      };
      ws.onmessage = (ev) => {
        try {
          const s = JSON.parse(ev.data as string) as WallSnapshot;
          setSnapshot(s);
          remember(s);
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        setLive(false);
        if (closed) return;
        timer = setTimeout(connect, retry);
        retry = Math.min(retry * 2, 15000);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (live) return;
      try {
        const s = await api.wall();
        if (!cancelled) {
          setSnapshot(s);
          remember(s);
        }
      } catch {
        /* offline: the cached snapshot stays on screen until the network returns */
      }
    };
    void tick();
    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [live, pollMs]);

  return { snapshot, live };
}
