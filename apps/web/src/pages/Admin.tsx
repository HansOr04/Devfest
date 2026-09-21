import { useCallback, useEffect, useState } from "react";
import { STATIONS, languageById, type CardDetail, type StationId } from "@devfest/shared";
import { api, getAdminToken, setAdminToken } from "../lib/api";
import { useWall } from "../lib/useWall";

type Overview = Awaited<ReturnType<typeof api.admin.overview>>;

/** Stage control: open stations, watch numbers, hide anything inappropriate. */
export default function Admin() {
  const [token, setTokenState] = useState(getAdminToken() ?? "");
  const [authed, setAuthed] = useState(Boolean(getAdminToken()));
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cards, setCards] = useState<(CardDetail & { hidden: boolean })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { snapshot } = useWall(3000);

  const refresh = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([api.admin.overview(), api.admin.cards()]);
      setOverview(o);
      setCards(c);
      setError(null);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      if ((e as { status?: number }).status === 401) setAuthed(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    void refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [authed, refresh]);

  if (!authed) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink px-6 text-paper">
        <form
          className="w-full max-w-sm space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setAdminToken(token);
            setAuthed(true);
          }}
        >
          <h1 className="pixel text-sm">panel del escenario</h1>
          <input
            type="password"
            className="w-full rounded-lg border border-white/15 bg-ink-2 px-3 py-2"
            placeholder="Token de admin"
            value={token}
            onChange={(e) => setTokenState(e.target.value)}
          />
          {error ? <p className="text-sm text-gred">{error}</p> : null}
          <button className="w-full rounded-lg bg-gblue py-2 font-medium">Entrar</button>
        </form>
      </main>
    );
  }

  const stations = snapshot?.stations ?? [];

  const toggle = async (id: StationId, open: boolean) => {
    await api.admin.setStation(id, open).catch((e) => setError(e.message));
    await refresh();
  };
  const advance = async (id: StationId) => {
    await api.admin.advanceTo(id).catch((e) => setError(e.message));
    await refresh();
  };
  const hide = async (seq: number, hidden: boolean) => {
    await api.admin.hide(seq, hidden).catch((e) => setError(e.message));
    setCards((cs) => cs.map((c) => (c.seq === seq ? { ...c, hidden } : c)));
  };

  return (
    <main className="min-h-dvh bg-ink px-4 py-6 text-paper sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-mist">DevFest</p>
            <h1 className="pixel mt-1 text-base">panel del escenario</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="text-sm text-gred hover:underline"
              onClick={async () => {
                if (window.confirm("¿Estás seguro de reiniciar todo el muro y borrar todos los participantes a cero?")) {
                  await api.admin.reset().catch((e) => setError(e.message));
                  await refresh();
                }
              }}
            >
              Reiniciar Muro
            </button>
            <a
              className="text-sm text-gblue underline"
              href={`/api/admin/export.csv?token=${encodeURIComponent(getAdminToken() ?? "")}`}
            >
              Exportar CSV
            </a>
          </div>
        </header>

        {error ? <p className="rounded-lg bg-gred/15 px-3 py-2 text-sm text-gred">{error}</p> : null}

        <section>
          <h2 className="mb-3 text-sm uppercase tracking-wider text-mist">Estaciones</h2>
          <div className="grid gap-3 sm:grid-cols-5">
            {STATIONS.map((s) => {
              const st = stations.find((x) => x.id === s.id);
              const open = st?.open ?? false;
              const n = overview?.perStation[s.id] ?? 0;
              return (
                <div key={s.id} className={`rounded-2xl border p-4 ${open ? "border-ggreen/50 bg-ggreen/10" : "border-white/10 bg-ink-2"}`}>
                  <p className="text-xs text-mist">Estación {s.order}</p>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-2 font-mono text-2xl">{n}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      className={`rounded-lg py-1.5 text-sm font-medium ${open ? "bg-white/10" : "bg-ggreen text-ink"}`}
                      onClick={() => void toggle(s.id, !open)}
                    >
                      {open ? "Cerrar" : "Abrir"}
                    </button>
                    <button className="rounded-lg border border-white/15 py-1.5 text-xs text-mist" onClick={() => void advance(s.id)}>
                      Abrir hasta aquí
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          <Stat label="Personas" value={overview?.total ?? 0} />
          <Stat label="Completaron las 5" value={overview?.done ?? 0} />
          <Stat label="Ocultas" value={overview?.hidden ?? 0} />
          <Stat label="Pantallas conectadas" value={snapshot ? "en vivo" : "—"} />
        </section>

        <section>
          <h2 className="mb-3 text-sm uppercase tracking-wider text-mist">Lenguajes más comunes</h2>
          <div className="flex flex-wrap gap-2">
            {(overview?.topLanguages ?? []).map((l) => {
              const lang = languageById(l.id);
              return (
                <span key={l.id} className="rounded-full border border-white/15 px-3 py-1 text-sm">
                  <span style={{ color: lang?.color }}>{lang?.name ?? l.id}</span> <span className="text-mist">{l.n}</span>
                </span>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm uppercase tracking-wider text-mist">Moderación · últimas respuestas</h2>
          <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
            {cards.map((c) => (
              <div key={c.seq} className={`flex gap-4 px-4 py-3 text-sm ${c.hidden ? "opacity-40" : ""}`}>
                <span className="w-16 shrink-0 font-mono text-xs text-mist">#{c.seq}</span>
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs text-mist">
                    {languageById(c.language)?.name ?? "—"} · {c.year ?? "—"}
                  </p>
                  {c.built ? <p>{c.built}</p> : null}
                  {c.broke ? <p className="text-mist">salió mal: {c.broke}</p> : null}
                  {c.advice ? <p className="italic">“{c.advice}”</p> : null}
                </div>
                <button
                  className={`shrink-0 self-start rounded-lg px-3 py-1 text-xs ${c.hidden ? "bg-ggreen/20 text-ggreen" : "bg-gred/20 text-gred"}`}
                  onClick={() => void hide(c.seq, !c.hidden)}
                >
                  {c.hidden ? "Mostrar" : "Ocultar"}
                </button>
              </div>
            ))}
            {cards.length === 0 ? <p className="px-4 py-6 text-sm text-mist">Todavía no hay respuestas de texto.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-ink-2 p-4">
      <p className="text-xs text-mist">{label}</p>
      <p className="mt-1 font-mono text-2xl">{value}</p>
    </div>
  );
}
