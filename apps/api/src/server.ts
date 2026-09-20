import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { env } from "./env.ts";
import { migrate, sql } from "./db.ts";
import { startSnapshotLoop } from "./snapshot.ts";
import { publicRoutes } from "./routes/public.ts";
import { adminRoutes } from "./routes/admin.ts";
import { wsRoutes } from "./routes/ws.ts";

const app = Fastify({
  logger: env.isProd ? { level: "info" } : { level: "info", transport: undefined },
  trustProxy: true,
  bodyLimit: 16 * 1024,
});

await app.register(cors, { origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",") });

// Thousands of phones share the venue's NAT, so we never limit by IP alone.
// Participants are keyed by their token; anonymous traffic gets a generous per-IP bucket.
await app.register(rateLimit, {
  global: true,
  max: 240,
  timeWindow: "1 minute",
  keyGenerator: (req) => {
    const h = req.headers["x-participant-token"];
    const t = Array.isArray(h) ? h[0] : h;
    return t ? `t:${t}` : `ip:${req.ip}`;
  },
  allowList: (req) => req.url === "/api/wall" || req.url === "/api/health" || req.url.startsWith("/ws"),
});

await app.register(websocket, { options: { maxPayload: 1024 } });

await app.register(publicRoutes);
await app.register(adminRoutes);
await app.register(wsRoutes);

const distCandidates = [
  join(process.cwd(), "apps/web/dist"),
  fileURLToPath(new URL("../../web/dist", import.meta.url)),
];
const webDist = distCandidates.find((dir) => existsSync(dir));
if (webDist) {
  await app.register(fastifyStatic, {
    root: webDist,
    prefix: "/",
    wildcard: false,
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api") || req.raw.url?.startsWith("/ws")) {
      reply.code(404).send({ error: "Ruta no encontrada" });
    } else {
      reply.sendFile("index.html");
    }
  });
}

app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
  app.log.error(err);
  const status = err.statusCode ?? 500;
  reply.code(status).send({ error: status === 500 ? "Algo salió mal" : err.message });
});

await migrate();
const loop = startSnapshotLoop();

const shutdown = async () => {
  clearInterval(loop);
  await app.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: env.port, host: env.host });
app.log.info(`API lista en http://${env.host}:${env.port}`);
