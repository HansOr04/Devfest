import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { getSnapshot, onSnapshot } from "../snapshot.ts";

/**
 * One WebSocket per screen (and per phone that keeps the mini wall open).
 * Everybody receives the same pre-serialized snapshot string, so broadcasting to
 * 4000 sockets is a loop of `send` calls with zero per-client work.
 */
export async function wsRoutes(app: FastifyInstance) {
  const clients = new Set<WebSocket>();

  onSnapshot((json) => {
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN && ws.bufferedAmount < 1_000_000) ws.send(json);
    }
  });

  // Keepalive so proxies do not drop idle screens.
  const ping = setInterval(() => {
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) ws.ping();
    }
  }, 25_000);
  app.addHook("onClose", async () => clearInterval(ping));

  app.get("/ws", { websocket: true }, (socket) => {
    clients.add(socket);
    socket.send(getSnapshot().json);
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });

  app.get("/api/ws-stats", async () => ({ clients: clients.size }));
}
