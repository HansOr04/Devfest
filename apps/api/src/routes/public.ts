import type { FastifyInstance, FastifyRequest } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  LANGUAGES,
  MAX_YEAR,
  MIN_YEAR,
  STATION_IDS,
  factFor,
  stationById,
  type CardDetail,
  type Participant,
  type StationId,
} from "@devfest/shared";
import { sql, type ParticipantRow } from "../db.ts";
import { getSnapshot, loadStations, markDirty } from "../snapshot.ts";

const LANGUAGE_IDS = new Set(LANGUAGES.map((l) => l.id));
const COLUMNS: Record<StationId, "language" | "year" | "built" | "broke" | "advice"> = {
  language: "language",
  year: "year",
  built: "built",
  broke: "broke",
  advice: "advice",
};

function toParticipant(row: ParticipantRow): Participant {
  const answers: Participant["answers"] = {};
  if (row.language) answers.language = row.language;
  if (row.year) answers.year = String(row.year);
  if (row.built) answers.built = row.built;
  if (row.broke) answers.broke = row.broke;
  if (row.advice) answers.advice = row.advice;
  return {
    id: row.id,
    seq: Number(row.seq),
    token: row.token,
    answers,
    createdAt: row.createdAt.toISOString(),
  };
}

function tokenOf(req: FastifyRequest): string | null {
  const h = req.headers["x-participant-token"];
  const t = Array.isArray(h) ? h[0] : h;
  return t && /^[a-f0-9]{48}$/.test(t) ? t : null;
}

/** Strip control chars and collapse whitespace. Keeps accents and emoji. */
function cleanText(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    const control = c < 32 || (c >= 127 && c <= 159);
    if (!control) out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

async function retryQuery<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 40 * attempt + Math.random() * 50));
    }
  }
}

export async function publicRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/state", async (_req, reply) => {
    const { snapshot, version } = getSnapshot();
    reply.header("cache-control", "public, max-age=1, stale-while-revalidate=2");
    reply.header("etag", `"s${version}"`);
    return { stations: snapshot.stations, count: snapshot.count };
  });

  app.post(
    "/api/join",
    { config: { rateLimit: { max: 20000, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const existing = tokenOf(req);
      if (existing) {
        const rows = await sql<ParticipantRow[]>`select * from participants where token = ${existing}`;
        if (rows[0]) return toParticipant(rows[0]);
      }
      const token = randomBytes(24).toString("hex");
      const rows = await retryQuery(() => sql<ParticipantRow[]>`
        insert into participants (token) values (${token}) returning *
      `);
      markDirty();
      reply.code(201);
      return toParticipant(rows[0]);
    },
  );

  app.get("/api/me", async (req, reply) => {
    const token = tokenOf(req);
    if (!token) return reply.code(401).send({ error: "Sin token" });
    const rows = await sql<ParticipantRow[]>`select * from participants where token = ${token}`;
    if (!rows[0]) return reply.code(404).send({ error: "No encontrado" });
    return toParticipant(rows[0]);
  });

  const answerBody = z.object({ value: z.string().min(1).max(500) });

  app.put("/api/answers/:station", async (req, reply) => {
    const token = tokenOf(req);
    if (!token) return reply.code(401).send({ error: "Sin token" });
    const stationId = (req.params as { station: string }).station;
    const station = stationById(stationId);
    if (!station) return reply.code(404).send({ error: "Estación desconocida" });

    const parsed = answerBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Respuesta inválida" });

    const stations = getSnapshot().snapshot.stations.length > 0
      ? getSnapshot().snapshot.stations
      : await loadStations();
    if (!stations.find((s) => s.id === station.id)?.open) {
      return reply.code(423).send({ error: "Esta estación todavía no está abierta" });
    }

    let value: string | number = cleanText(parsed.data.value);
    if (station.kind === "choice") {
      if (!LANGUAGE_IDS.has(value)) return reply.code(400).send({ error: "Lenguaje inválido" });
    } else if (station.kind === "year") {
      const y = Number(value);
      if (!Number.isInteger(y) || y < MIN_YEAR || y > MAX_YEAR) {
        return reply.code(400).send({ error: `Año entre ${MIN_YEAR} y ${MAX_YEAR}` });
      }
      value = y;
    } else {
      if (value.length === 0) return reply.code(400).send({ error: "Escribe algo" });
      if (station.maxLength && value.length > station.maxLength) {
        return reply.code(400).send({ error: `Máximo ${station.maxLength} caracteres` });
      }
    }

    const col = COLUMNS[station.id];
    const rows = await retryQuery(() => sql<ParticipantRow[]>`
      update participants
      set ${sql(col)} = ${value}, updated_at = now()
      where token = ${token}
      returning *
    `);
    if (!rows[0]) return reply.code(404).send({ error: "No encontrado" });
    markDirty();

    const participant = toParticipant(rows[0]);
    const extra = station.kind === "year" ? { fact: factFor(Number(value)) } : {};
    return { participant, ...extra };
  });

  app.get("/api/wall", async (req, reply) => {
    const { json, gzipped, version } = getSnapshot();
    const etag = `"w${version}"`;
    if (req.headers["if-none-match"] === etag) {
      return reply.code(304).send();
    }
    reply.header("content-type", "application/json; charset=utf-8");
    reply.header("cache-control", "public, max-age=2, stale-while-revalidate=5");
    reply.header("etag", etag);

    const acceptEncoding = (req.headers["accept-encoding"] as string | undefined) || "";
    if (acceptEncoding.includes("gzip")) {
      reply.header("content-encoding", "gzip");
      return reply.send(gzipped);
    }
    return reply.send(json);
  });

  app.get("/api/cards/:seq", async (req, reply) => {
    const seq = Number((req.params as { seq: string }).seq);
    if (!Number.isInteger(seq) || seq < 1) return reply.code(400).send({ error: "seq inválido" });
    const rows = await sql<ParticipantRow[]>`
      select * from participants where seq = ${seq} and hidden = false
    `;
    if (!rows[0]) return reply.code(404).send({ error: "No encontrado" });
    const r = rows[0];
    const detail: CardDetail = { seq };
    if (r.language) detail.language = r.language;
    if (r.year) detail.year = r.year;
    if (r.built) detail.built = r.built;
    if (r.broke) detail.broke = r.broke;
    if (r.advice) detail.advice = r.advice;
    reply.header("cache-control", "public, max-age=10");
    return detail;
  });

  /** Random set of finished cards for the big-screen ticker. */
  app.get("/api/quotes", async (req, reply) => {
    const limit = Math.min(60, Math.max(1, Number((req.query as { limit?: string }).limit ?? 30)));
    const rows = await sql<{ seq: string; language: string | null; year: number | null; advice: string | null; broke: string | null; built: string | null }[]>`
      select seq, language, year, advice, broke, built from participants
      where hidden = false and (advice is not null or broke is not null or built is not null)
      order by random() limit ${limit}
    `;
    reply.header("cache-control", "public, max-age=5");
    return rows.map((r) => ({
      seq: Number(r.seq),
      language: r.language ?? undefined,
      year: r.year ?? undefined,
      advice: r.advice ?? undefined,
      broke: r.broke ?? undefined,
      built: r.built ?? undefined,
    }));
  });

  /**
   * The room, right after you answer. Stations open one at a time, so everybody is on
   * the same question: an echo is only ever taken from the station just answered, and
   * the choice stations get aggregates instead, because nobody has written anything yet.
   */
  app.get("/api/echo/:station", async (req, reply) => {
    const stationId = (req.params as { station: string }).station;
    const station = stationById(stationId);
    if (!station) return reply.code(404).send({ error: "Estación desconocida" });

    const q = req.query as { language?: string; year?: string; seq?: string };
    const seq = Number(q.seq ?? 0);
    const year = q.year ? Number(q.year) : null;
    const lang = q.language && LANGUAGE_IDS.has(q.language) ? q.language : null;

    const twinsQ = sql<{ langN: string; yearN: string }[]>`
      select
        count(*) filter (where language is not null and language = ${lang})::text as lang_n,
        count(*) filter (where year is not null and year = ${year})::text as year_n
      from participants where hidden = false
    `;

    reply.header("cache-control", "no-store");

    if (station.kind === "text") {
      const col = COLUMNS[station.id];
      // Prefer people who share your language or year; otherwise anyone who answered
      // this same question. Never another question: they have not reached it yet.
      const [twins, near, count] = await Promise.all([
        twinsQ,
        sql<{ seq: string; language: string | null; year: number | null; text: string | null }[]>`
          select seq, language, year, ${sql(col)} as text from participants
          where hidden = false and ${sql(col)} is not null and seq <> ${seq}
          order by (language = ${lang})::int + (year = ${year})::int desc, random()
          limit 3
        `,
        sql<{ n: string }[]>`
          select count(${sql(col)})::text as n from participants where hidden = false
        `,
      ]);
      return {
        sameLanguage: Number(twins[0]?.langN ?? 0),
        sameYear: Number(twins[0]?.yearN ?? 0),
        answered: Number(count[0]?.n ?? 0),
        echoes: near.map((e) => ({
          seq: Number(e.seq),
          language: e.language ?? undefined,
          year: e.year ?? undefined,
          text: e.text ?? "",
        })),
        top: [],
        oldest: null,
      };
    }

    if (station.kind === "choice") {
      const [twins, top] = await Promise.all([
        twinsQ,
        sql<{ language: string; n: string }[]>`
          select language, count(*)::text as n from participants
          where hidden = false and language is not null
          group by language order by count(*) desc limit 3
        `,
      ]);
      return {
        sameLanguage: Number(twins[0]?.langN ?? 0),
        sameYear: 0,
        answered: 0,
        echoes: [],
        top: top.map((t) => ({ id: t.language, n: Number(t.n) })),
        oldest: null,
      };
    }

    // Year station: the shape of the room in time, plus how many started before you.
    const [twins, span, before] = await Promise.all([
      twinsQ,
      sql<{ oldest: number | null; newest: number | null; n: string }[]>`
        select min(year) as oldest, max(year) as newest, count(year)::text as n
        from participants where hidden = false
      `,
      sql<{ n: string }[]>`
        select count(*)::text as n from participants
        where hidden = false and year is not null and year < ${year}
      `,
    ]);
    return {
      sameLanguage: 0,
      sameYear: Number(twins[0]?.yearN ?? 0),
      answered: Number(span[0]?.n ?? 0),
      echoes: [],
      top: [],
      oldest: span[0]?.oldest
        ? {
            year: span[0].oldest,
            newest: span[0].newest ?? span[0].oldest,
            total: Number(span[0].n),
            before: Number(before[0]?.n ?? 0),
          }
        : null,
    };
  });

  /** Aggregates for the filter chips and the stats strip. */
  app.get("/api/stats", async (_req, reply) => {
    const [langs, years, stations] = await Promise.all([
      sql<{ language: string; n: string }[]>`
        select language, count(*)::text as n from participants
        where hidden = false and language is not null group by language order by count(*) desc
      `,
      sql<{ year: number; n: string }[]>`
        select year, count(*)::text as n from participants
        where hidden = false and year is not null group by year order by year
      `,
      sql<{ language: string; year: string; built: string; broke: string; advice: string }[]>`
        select count(language)::text as language, count(year)::text as year, count(built)::text as built,
               count(broke)::text as broke, count(advice)::text as advice
        from participants where hidden = false
      `,
    ]);
    reply.header("cache-control", "public, max-age=5");
    const s = stations[0];
    return {
      languages: langs.map((l) => ({ id: l.language, n: Number(l.n) })),
      years: years.map((y) => ({ year: y.year, n: Number(y.n) })),
      completed: Object.fromEntries(STATION_IDS.map((id) => [id, Number(s[id])])),
    };
  });
}
