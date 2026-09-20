import postgres from "postgres";
import { env } from "./env.ts";

export const sql = postgres(env.databaseUrl, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: postgres.camel,
});

export async function migrate() {
  await sql`create extension if not exists pgcrypto`;
  await sql`
    create table if not exists participants (
      id uuid primary key default gen_random_uuid(),
      seq bigserial not null unique,
      token text not null unique,
      language text,
      year int,
      built text,
      broke text,
      advice text,
      hidden boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists participants_seq_idx on participants (seq)`;
  await sql`create index if not exists participants_language_idx on participants (language)`;
  await sql`
    create table if not exists stations (
      id text primary key,
      open boolean not null default false,
      opened_at timestamptz
    )
  `;
  await sql`
    insert into stations (id) values ('language'), ('year'), ('built'), ('broke'), ('advice')
    on conflict (id) do nothing
  `;
}

export interface ParticipantRow {
  id: string;
  seq: number | string;
  token: string;
  language: string | null;
  year: number | null;
  built: string | null;
  broke: string | null;
  advice: string | null;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StationRow {
  id: string;
  open: boolean;
  openedAt: Date | null;
}
