import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { STATION_IDS, stationById } from "@devfest/shared";
import { sql } from "../db.ts";
import { env } from "../env.ts";
import { markDirty, rebuild } from "../snapshot.ts";

function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  const h = req.headers["x-admin-token"];
  const q = (req.query as { token?: string } | undefined)?.token;
  const t = (Array.isArray(h) ? h[0] : h) ?? q;
  if (t !== env.adminToken) {
    reply.code(401).send({ error: "Token de admin inválido" });
    return false;
  }
  return true;
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    if (!requireAdmin(req, reply)) return reply;
  });

  app.get("/api/admin/overview", async () => {
    const [counts, langs, recent] = await Promise.all([
      sql<{ total: string; hidden: string; language: string; year: string; built: string; broke: string; advice: string; done: string }[]>`
        select count(*)::text as total,
               count(*) filter (where hidden)::text as hidden,
               count(language)::text as language, count(year)::text as year, count(built)::text as built,
               count(broke)::text as broke, count(advice)::text as advice,
               count(*) filter (where language is not null and year is not null and built is not null and broke is not null and advice is not null)::text as done
        from participants
      `,
      sql<{ language: string; n: string }[]>`
        select language, count(*)::text as n from participants
        where language is not null group by language order by count(*) desc limit 10
      `,
      sql<{ seq: string; language: string | null; year: number | null; built: string | null; broke: string | null; advice: string | null; hidden: boolean; updatedAt: Date }[]>`
        select seq, language, year, built, broke, advice, hidden, updated_at
        from participants order by updated_at desc limit 40
      `,
    ]);
    const c = counts[0];
    return {
      total: Number(c.total),
      hidden: Number(c.hidden),
      done: Number(c.done),
      perStation: Object.fromEntries(STATION_IDS.map((id) => [id, Number(c[id])])),
      topLanguages: langs.map((l) => ({ id: l.language, n: Number(l.n) })),
      recent: recent.map((r) => ({ ...r, seq: Number(r.seq), updatedAt: r.updatedAt.toISOString() })),
    };
  });

  const toggleBody = z.object({ open: z.boolean() });

  app.post("/api/admin/stations/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    if (!stationById(id)) return reply.code(404).send({ error: "Estación desconocida" });
    const parsed = toggleBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Body inválido" });
    await sql`
      update stations set open = ${parsed.data.open},
        opened_at = case when ${parsed.data.open} then coalesce(opened_at, now()) else opened_at end
      where id = ${id}
    `;
    markDirty();
    await rebuild(true);
    return { id, open: parsed.data.open };
  });

  /** Open every station up to and including `id`, close the rest. Handy from the stage. */
  app.post("/api/admin/stations/advance-to/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const target = stationById(id);
    if (!target) return reply.code(404).send({ error: "Estación desconocida" });
    const openIds = STATION_IDS.filter((s) => (stationById(s)?.order ?? 99) <= target.order);
    await sql.begin(async (tx) => {
      await tx`update stations set open = false where id <> all(${openIds})`;
      await tx`update stations set open = true, opened_at = coalesce(opened_at, now()) where id = any(${openIds})`;
    });
    markDirty();
    await rebuild(true);
    return { open: openIds };
  });

  const hideBody = z.object({ hidden: z.boolean() });

  app.post("/api/admin/cards/:seq/hide", async (req, reply) => {
    const seq = Number((req.params as { seq: string }).seq);
    const parsed = hideBody.safeParse(req.body);
    if (!Number.isInteger(seq) || !parsed.success) return reply.code(400).send({ error: "Inválido" });
    await sql`update participants set hidden = ${parsed.data.hidden} where seq = ${seq}`;
    markDirty();
    return { seq, hidden: parsed.data.hidden };
  });

  /** Moderation feed: latest text answers, newest first. */
  app.get("/api/admin/cards", async (req) => {
    const q = req.query as { limit?: string; before?: string };
    const limit = Math.min(200, Math.max(1, Number(q.limit ?? 100)));
    const before = q.before ? Number(q.before) : null;
    const rows = await sql<{ seq: string; language: string | null; year: number | null; built: string | null; broke: string | null; advice: string | null; hidden: boolean }[]>`
      select seq, language, year, built, broke, advice, hidden from participants
      where (built is not null or broke is not null or advice is not null)
        and (${before}::bigint is null or seq < ${before})
      order by seq desc limit ${limit}
    `;
    return rows.map((r) => ({ ...r, seq: Number(r.seq) }));
  });

  /** CSV export of everything, for the community afterwards. */
  app.get("/api/admin/export.csv", async (_req, reply) => {
    const rows = await sql<{ seq: string; language: string | null; year: number | null; built: string | null; broke: string | null; advice: string | null; hidden: boolean; createdAt: Date }[]>`
      select seq, language, year, built, broke, advice, hidden, created_at from participants order by seq
    `;
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = "seq,language,year,built,broke,advice,hidden,created_at";
    const body = rows
      .map((r) => [r.seq, r.language, r.year, r.built, r.broke, r.advice, r.hidden, r.createdAt.toISOString()].map(esc).join(","))
      .join("\n");
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", 'attachment; filename="mi-primer-proyecto.csv"');
    return `${header}\n${body}\n`;
  });

  /** Reset everything: delete all participants, reset sequences, close stations and clear wall snapshot. */
  app.post("/api/admin/reset", async () => {
    await sql`truncate participants restart identity`;
    await sql`update stations set open = false, opened_at = null`;
    markDirty();
    await rebuild(true);
    return { ok: true, message: "Muro y participantes reseteados a cero exitosamente" };
  });
}
