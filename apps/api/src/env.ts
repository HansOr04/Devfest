function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 3010),
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl: req("DATABASE_URL", "postgres://devfest:devfest@localhost:5442/devfest"),
  adminToken: req("ADMIN_TOKEN", "devfest-admin"),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  /** How often (ms) the wall snapshot is rebuilt and pushed to screens. */
  snapshotIntervalMs: Number(process.env.SNAPSHOT_INTERVAL_MS ?? 2000),
  isProd: process.env.NODE_ENV === "production",
};
