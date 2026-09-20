import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BRAND_SEQUENCE,
  DECADE_LABELS,
  EVENT,
  LANGUAGES,
  MAX_YEAR,
  MIN_YEAR,
  STATIONS,
  decadeOf,
  languageById,
  type CardDetail,
  type Participant,
  type Station,
  type StationId,
} from "@devfest/shared";
import { api, ApiError } from "../lib/api";
import { useWall } from "../lib/useWall";
import WallCanvas from "../components/WallCanvas";
import EraFrame, { type Era } from "../components/EraFrame";
import MemoryReveal from "../components/MemoryReveal";
import Celebration from "../components/Celebration";
import BrandMark from "../components/BrandMark";
import Welcome from "../components/Welcome";
import { hasSeenWelcome, markWelcomeSeen } from "../lib/storage";

type Phase = "loading" | "ready" | "offline";

const COMPILE_LINES: Record<Era | "none", string[]> = {
  none: ["Guardando tu recuerdo…", "Sincronizando con el muro…", "Listo."],
  pre2000: ["C:\\> COMPILING…", "Leyendo disquete 1 de 1…", "Listo. Presiona cualquier tecla."],
  "2000s": ["Conectando al módem…", "Subiendo a tu perfil…", "¡Listo! Tu recuerdo está en línea."],
  "2010s": ["$ git add recuerdo.txt", '$ git commit -m "mi primer proyecto"', "[main] 1 file changed. Listo."],
  "2020s": ["npm run recordar", "Compilando con 0 warnings…", "Deploy completo. Listo."],
};

/** Resolve the current participant once, even if several effects ask at the same time. */
let identifying: Promise<Participant> | null = null;
function identify(): Promise<Participant> {
  if (!identifying) {
    identifying = api
      .me()
      .catch((e: ApiError) => {
        if (e.status === 401 || e.status === 404) return api.join();
        throw e;
      })
      .finally(() => {
        identifying = null;
      });
  }
  return identifying;
}

function toCard(p: Participant): CardDetail {
  return {
    seq: p.seq,
    language: p.answers.language,
    year: p.answers.year ? Number(p.answers.year) : undefined,
    built: p.answers.built,
    broke: p.answers.broke,
    advice: p.answers.advice,
  };
}

export default function Home() {
  const [welcomed, setWelcomed] = useState(hasSeenWelcome);
  // Paint from the cached participant first; the network refresh follows.
  const [phase, setPhase] = useState<Phase>(() => (api.cachedMe() ? "ready" : "loading"));
  const [me, setMe] = useState<Participant | null>(api.cachedMe);
  const [active, setActive] = useState<StationId | null>(null);
  const [reveal, setReveal] = useState<{ station: StationId; fact?: string } | null>(null);
  const [exploring, setExploring] = useState(false);
  const { snapshot } = useWall(5000);

  const load = useCallback(async () => {
    try {
      setMe(await identify());
      setPhase("ready");
    } catch {
      // A cached participant keeps the app usable while the network is down.
      setPhase(api.cachedMe() ? "ready" : "offline");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const year = me?.answers.year ? Number(me.answers.year) : null;
  const era: Era | null = year ? decadeOf(year) : null;
  const stations = snapshot?.stations ?? [];
  const isOpen = (id: StationId) => stations.find((s) => s.id === id)?.open ?? false;
  const doneCount = STATIONS.filter((s) => me?.answers[s.id]).length;
  const allDone = doneCount === STATIONS.length;

  const nextStation = useMemo(
    () => STATIONS.find((s) => !me?.answers[s.id] && isOpen(s.id)) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me, stations],
  );

  useEffect(() => {
    if (!active && !reveal && nextStation && phase === "ready") setActive(nextStation.id);
  }, [nextStation, active, reveal, phase]);

  // The era drives the page background, so it must live on <html>, not on a box.
  useEffect(() => {
    if (era && !allDone) document.documentElement.dataset.era = era;
    else delete document.documentElement.dataset.era;
    return () => {
      delete document.documentElement.dataset.era;
    };
  }, [era, allDone]);

  if (!welcomed) {
    return (
      <Welcome
        onDone={() => {
          markWelcomeSeen();
          setWelcomed(true);
        }}
      />
    );
  }

  if (phase === "loading") {
    return (
      <main className="screen flex items-center justify-center bg-ink px-6 text-center">
        <p className="pixel cursor-blink text-xs text-mist">cargando recuerdos</p>
      </main>
    );
  }

  if (phase === "offline" || !me) {
    return (
      <main className="screen flex flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="pixel text-sm text-gred">error 404: wifi</p>
        <p className="max-w-sm text-mist">No pudimos conectarnos. Revisa tu conexión e intenta otra vez.</p>
        <button className="rounded-full bg-gblue px-6 py-3 font-medium text-white" onClick={() => void load()}>
          Reintentar
        </button>
      </main>
    );
  }

  // The fifth reveal has to play before the finale takes over the screen.
  if (allDone && !exploring && !reveal) {
    return <Celebration card={toCard(me)} snapshot={snapshot} onExplore={() => setExploring(true)} />;
  }

  return (
    <main className="era-root screen">
      <div className="mx-auto w-full max-w-5xl px-4 pt-5 safe-bottom sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
          {/* Brand + live wall. Sticks to the top on wide screens. */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BrandMark size={22} />
                  <p className="truncate text-[11px] uppercase tracking-[0.2em] opacity-70">el muro de</p>
                </div>
                <h1 className="pixel mt-1.5 text-[13px] leading-tight sm:text-base lg:text-lg">mi primer proyecto</h1>
                <p className="mt-1.5 text-[11px] opacity-60 sm:text-xs">
                  {EVENT.name} · {EVENT.tagline}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] opacity-70">tu commit</p>
                <p className="font-mono text-lg font-bold leading-tight sm:text-xl">
                  #{String(me.seq).padStart(4, "0")}
                </p>
              </div>
            </header>

            <section className="mb-4 overflow-hidden rounded-2xl bg-black/25">
              <div className="h-24 sm:h-32 lg:h-44">
                <WallCanvas snapshot={snapshot} highlightSeq={me.seq} padding={10} showGlyphs={false} />
              </div>
              <p className="px-3 pb-2.5 text-[11px] leading-snug opacity-70 sm:text-xs">
                {(snapshot?.count ?? 0).toLocaleString("es")} personas ya están en la palabra. El cuadro que parpadea
                eres tú.
              </p>
            </section>

            <ol className="mb-2 flex gap-1.5" aria-label="Progreso">
              {STATIONS.map((s) => {
                const done = Boolean(me.answers[s.id]);
                const open = isOpen(s.id);
                return (
                  <li
                    key={s.id}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                      done ? "bg-ggreen" : open ? "bg-gyellow" : "bg-white/15"
                    }`}
                    title={s.title}
                  />
                );
              })}
            </ol>
            <p className="mb-5 text-[11px] opacity-60">
              {doneCount} de {STATIONS.length} recuerdos guardados
            </p>
          </div>

          {/* Stations */}
          <div className="flex flex-col gap-3 pb-10">
            {STATIONS.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.06, 0.3), duration: 0.35 }}
              >
                <StationCard
                  station={s}
                  era={era}
                  answer={me.answers[s.id]}
                  open={isOpen(s.id)}
                  active={active === s.id}
                  onOpen={() => setActive(s.id)}
                  onSaved={(p, fact) => {
                    setMe(p);
                    setActive(null);
                    setReveal({ station: s.id, fact });
                  }}
                />
              </motion.div>
            ))}

            {exploring ? (
              <button
                type="button"
                onClick={() => setExploring(false)}
                className="mt-2 rounded-2xl border border-white/15 py-3 text-sm font-medium"
              >
                Volver a mi certificado
              </button>
            ) : null}
          </div>
        </div>

        <footer className="border-t border-current/10 py-6 text-center text-[11px] opacity-60">
          <div className="mb-2 flex justify-center gap-1.5">
            {BRAND_SEQUENCE.map((c) => (
              <span key={c} className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
          Cada cuadro del muro es una persona de esta sala · {EVENT.date}
        </footer>
      </div>

      <AnimatePresence>
        {reveal ? (
          <MemoryReveal
            key={reveal.station}
            station={reveal.station}
            fact={reveal.fact}
            language={me.answers.language}
            year={me.answers.year}
            answer={me.answers[reveal.station]}
            seq={me.seq}
            onClose={() => setReveal(null)}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

interface StationCardProps {
  station: Station;
  era: Era | null;
  answer?: string;
  open: boolean;
  active: boolean;
  onOpen: () => void;
  onSaved: (p: Participant, fact?: string) => void;
}

function StationCard({ station, era, answer, open, active, onOpen, onSaved }: StationCardProps) {
  const done = Boolean(answer);
  const label = done ? summarize(station, answer!) : null;

  if (!active || !open) {
    return (
      <button
        type="button"
        onClick={open ? onOpen : undefined}
        disabled={!open}
        className={`flex w-full items-center gap-3 border px-4 py-3.5 text-left transition sm:px-5 sm:py-4 ${
          done
            ? "border-ggreen/40 bg-ggreen/10"
            : open
              ? "border-gyellow/60 bg-gyellow/10 active:scale-[0.99] sm:hover:bg-gyellow/15"
              : "border-current/10 bg-current/5 opacity-60"
        }`}
        style={{ borderRadius: "var(--era-radius, 14px)" }}
      >
        <span className="pixel shrink-0 text-[10px] opacity-70">0{station.order}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium sm:text-base">{station.title}</span>
          <span className="mt-0.5 block text-xs opacity-70 sm:text-[13px]">
            {done ? label : open ? "Abierta ahora. Toca para responder." : "Se abre más tarde. Atento al escenario."}
          </span>
        </span>
        <span className="shrink-0 text-xs opacity-70">{done ? "✓" : open ? "→" : "🔒"}</span>
      </button>
    );
  }

  return <StationForm station={station} era={era} initial={answer} onSaved={onSaved} />;
}

function summarize(station: Station, value: string) {
  if (station.id === "language") return languageById(value)?.name ?? value;
  if (station.id === "year") return `${value} · ${DECADE_LABELS[decadeOf(Number(value))]}`;
  return value;
}

interface FormProps {
  station: Station;
  era: Era | null;
  initial?: string;
  onSaved: (p: Participant, fact?: string) => void;
}

function StationForm({ station, era, initial, onSaved }: FormProps) {
  const [value, setValue] = useState(initial ?? (station.kind === "year" ? "2010" : ""));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const lines = COMPILE_LINES[era ?? "none"];

  useEffect(() => {
    if (!saving) return;
    setLineIdx(0);
    const id = setInterval(() => setLineIdx((i) => Math.min(i + 1, lines.length - 1)), 450);
    return () => clearInterval(id);
  }, [saving, lines.length]);

  const submit = async () => {
    const v = value.trim();
    if (!v) return setError("Escribe algo primero");
    if (station.maxLength && v.length > station.maxLength) return setError(`Máximo ${station.maxLength} caracteres`);
    setError(null);
    setSaving(true);
    const started = Date.now();
    try {
      const res = await api.answer(station.id, v);
      const wait = Math.max(0, 1400 - (Date.now() - started));
      setTimeout(() => {
        setSaving(false);
        onSaved(res.participant, res.fact);
      }, wait);
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const yearNum = Number(value);

  return (
    <EraFrame era={era} title={`estacion_0${station.order}_${station.id}.txt`}>
      <p className="mb-1 text-[11px] uppercase tracking-widest opacity-60">Estación {station.order} de 5</p>
      <h2 className="mb-1 text-lg font-semibold leading-snug sm:text-xl">{station.prompt}</h2>
      <p className="mb-4 text-sm opacity-70">{station.hint}</p>

      {saving ? (
        <div className="min-h-28 rounded-lg bg-black/80 p-3 font-mono text-xs text-[#a6e22e] sm:text-sm">
          {lines.slice(0, lineIdx + 1).map((l, i) => (
            <p key={i} className={i === lineIdx ? "cursor-blink" : ""}>
              {l}
            </p>
          ))}
        </div>
      ) : station.kind === "choice" ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setValue(l.id);
                setError(null);
              }}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center text-[12px] leading-tight transition active:scale-95 ${
                value === l.id ? "border-current bg-current/15" : "border-current/15 bg-black/10"
              }`}
              style={{ borderColor: value === l.id ? l.color : undefined }}
            >
              <span className="font-mono text-sm font-bold" style={{ color: l.color }}>
                {l.glyph}
              </span>
              <span className="opacity-90">{l.name}</span>
            </button>
          ))}
        </div>
      ) : station.kind === "year" ? (
        <div>
          <div className="mb-3 flex items-center justify-center gap-4">
            <button
              type="button"
              className="era-btn h-12 w-12 text-xl"
              onClick={() => setValue(String(Math.max(MIN_YEAR, yearNum - 1)))}
              aria-label="Un año menos"
            >
              −
            </button>
            <input
              className="era-input w-32 py-2 text-center font-mono text-4xl font-bold sm:w-40 sm:text-5xl"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              aria-label="Año"
            />
            <button
              type="button"
              className="era-btn h-12 w-12 text-xl"
              onClick={() => setValue(String(Math.min(MAX_YEAR, yearNum + 1)))}
              aria-label="Un año más"
            >
              +
            </button>
          </div>
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={Number.isFinite(yearNum) ? Math.min(MAX_YEAR, Math.max(MIN_YEAR, yearNum)) : 2010}
            onChange={(e) => setValue(e.target.value)}
            className="w-full accent-[var(--era-accent)]"
            aria-label="Deslizar año"
          />
          <p className="mt-2 text-center text-sm opacity-80">
            {Number.isFinite(yearNum) && yearNum >= MIN_YEAR && yearNum <= MAX_YEAR
              ? `Eso fue en ${DECADE_LABELS[decadeOf(yearNum)]}. Tu pantalla cambiará de época.`
              : `Un año entre ${MIN_YEAR} y ${MAX_YEAR}`}
          </p>
        </div>
      ) : (
        <div>
          <textarea
            className="era-input w-full resize-none px-3 py-2.5 text-base"
            rows={3}
            maxLength={station.maxLength}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder={placeholderFor(station.id)}
            aria-label={station.title}
          />
          <p className="mt-1 text-right font-mono text-[11px] opacity-60">
            {value.length}/{station.maxLength}
          </p>
        </div>
      )}

      {error ? <p className="mt-2 text-sm text-gred">{error}</p> : null}

      {!saving ? (
        <button
          type="button"
          onClick={() => void submit()}
          className="era-btn mt-4 w-full py-3.5 text-base active:scale-[0.99]"
        >
          {era === "2010s" || era === "2020s" ? "git commit" : "Guardar recuerdo"}
        </button>
      ) : null}
    </EraFrame>
  );
}

function placeholderFor(id: StationId) {
  switch (id) {
    case "built":
      return "Una calculadora en la consola que solo sumaba";
    case "broke":
      return "Borré la carpeta del proyecto pensando que era la copia";
    case "advice":
      return "No tienes que entender todo hoy";
    default:
      return "";
  }
}
