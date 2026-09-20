import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DECADE_COLORS,
  DECADE_LABELS,
  EVENT,
  STATIONS,
  decadeOf,
  languageById,
  layoutFor,
  type CardDetail,
} from "@devfest/shared";
import { api } from "../lib/api";
import { useWall } from "../lib/useWall";
import WallCanvas, { type WallFilter } from "../components/WallCanvas";
import BrandMark from "../components/BrandMark";

const DECADES = ["pre2000", "2000s", "2010s", "2020s"] as const;

/** Big screen. Also works on a phone in landscape for people who want to explore. */
export default function Wall() {
  const { snapshot, live } = useWall(3000);
  const [filter, setFilter] = useState<WallFilter | null>(null);
  const [picked, setPicked] = useState<CardDetail | null>(null);
  const [spot, setSpot] = useState<CardDetail | null>(null);
  const [quotes, setQuotes] = useState<CardDetail[]>([]);
  const [stats, setStats] = useState<{ languages: { id: string; n: number }[] } | null>(null);

  useEffect(() => {
    const load = () => api.stats().then(setStats).catch(() => undefined);
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = () => api.quotes(40).then(setQuotes).catch(() => undefined);
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  // Auto spotlight: every few seconds highlight one finished card when nobody picked one.
  useEffect(() => {
    if (picked) return;
    const withText = quotes.filter((q) => q.built || q.advice);
    if (withText.length === 0) return;
    let i = Math.floor(Math.random() * withText.length);
    const show = () => {
      setSpot(withText[i % withText.length]);
      i++;
    };
    show();
    const id = setInterval(show, 9000);
    return () => clearInterval(id);
  }, [quotes, picked]);

  const onPick = async (seq: number | null) => {
    if (!seq) return setPicked(null);
    try {
      setPicked(await api.card(seq));
    } catch {
      setPicked({ seq });
    }
  };

  const count = snapshot?.count ?? 0;
  const layout = layoutFor(count);
  const perStation = useMemo(() => {
    const cards = snapshot?.cards ?? [];
    return STATIONS.map((s) => cards.filter((c) => c.p >= s.order).length);
  }, [snapshot]);

  const topLangs = (stats?.languages ?? []).slice(0, 8);
  const featured = picked ?? spot;

  return (
    <main className="screen-fixed relative flex flex-col overflow-hidden bg-ink text-paper">
      <header className="flex items-center justify-between gap-4 px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BrandMark size={24} />
            <p className="truncate text-[10px] uppercase tracking-[0.25em] text-mist sm:text-xs">el muro de</p>
          </div>
          <h1 className="pixel mt-1 text-sm leading-tight sm:text-lg lg:text-2xl">mi primer proyecto</h1>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-3xl font-bold leading-none sm:text-5xl lg:text-6xl">
            {count.toLocaleString("es")}
          </p>
          <p className="text-[10px] text-mist sm:text-xs">
            recuerdos · nivel {layout.k}x{layout.k} · {live ? "en vivo" : "reconectando"}
          </p>
        </div>
      </header>

      <div className="no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto px-4 py-2 sm:flex-wrap sm:overflow-visible sm:px-6">
        <Chip active={!filter} onClick={() => setFilter(null)}>
          Todos
        </Chip>
        {DECADES.map((d) => (
          <Chip key={d} active={filter?.decade === d} color={DECADE_COLORS[d]} onClick={() => setFilter({ decade: d })}>
            {DECADE_LABELS[d]}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-white/15" />
        {topLangs.map((l) => {
          const lang = languageById(l.id);
          return (
            <Chip key={l.id} active={filter?.language === l.id} color={lang?.color} onClick={() => setFilter({ language: l.id })}>
              {lang?.name ?? l.id} <span className="opacity-60">{l.n}</span>
            </Chip>
          );
        })}
      </div>

      <section className="flex min-h-0 flex-1 gap-4 px-2 sm:px-4">
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
            <WallCanvas snapshot={snapshot} filter={filter} onPick={onPick} highlightSeq={featured?.seq ?? null} padding={16} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {featured ? (
            <motion.aside
              key={featured.seq}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.35 }}
              className="hidden w-80 shrink-0 self-center rounded-2xl border border-white/10 bg-ink-2 p-5 shadow-2xl md:block"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-mist">commit #{String(featured.seq).padStart(4, "0")}</span>
                {picked ? (
                  <button className="text-xs text-mist hover:text-paper" onClick={() => setPicked(null)}>
                    cerrar ×
                  </button>
                ) : null}
              </div>
              <Detail card={featured} />
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </section>

      <footer className="shrink-0 border-t border-white/10">
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 py-2 text-[11px] text-mist sm:gap-6 sm:px-6 sm:text-xs">
          {STATIONS.map((s, i) => (
            <span key={s.id} className="flex shrink-0 items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${snapshot?.stations.find((x) => x.id === s.id)?.open ? "bg-ggreen" : "bg-white/20"}`} />
              {s.title} <span className="font-mono text-paper">{perStation[i]}</span>
            </span>
          ))}
        </div>
        <Ticker quotes={quotes} />
      </footer>
    </main>
  );
}

function Chip({
  children,
  active,
  color,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-white bg-white/15" : "border-white/15 text-mist hover:text-paper"}`}
      style={{ borderColor: active && color ? color : undefined }}
    >
      {color ? <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: color }} /> : null}
      {children}
    </button>
  );
}

function Detail({ card }: { card: CardDetail }) {
  const lang = languageById(card.language);
  const dec = card.year ? decadeOf(card.year) : null;
  return (
    <div className="space-y-2 text-sm">
      <p className="flex items-baseline gap-2">
        {lang ? (
          <span className="font-mono text-lg font-bold" style={{ color: lang.color }}>
            {lang.name}
          </span>
        ) : (
          <span className="text-mist">Todavía sin lenguaje</span>
        )}
        {card.year ? (
          <span className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: dec ? DECADE_COLORS[dec] : undefined, color: "#0b0b12" }}>
            {card.year}
          </span>
        ) : null}
      </p>
      {card.built ? <p className="text-paper">{card.built}</p> : null}
      {card.broke ? (
        <p className="text-mist">
          <span className="text-gred">salió mal:</span> {card.broke}
        </p>
      ) : null}
      {card.advice ? <p className="border-l-2 border-gyellow pl-3 italic text-paper/90">“{card.advice}”</p> : null}
      {!card.built && !card.broke && !card.advice ? <p className="text-mist">Esta persona todavía está escribiendo su historia.</p> : null}
    </div>
  );
}

function Ticker({ quotes }: { quotes: CardDetail[] }) {
  const items = quotes.filter((q) => q.advice).slice(0, 20);
  if (items.length === 0) {
    return <p className="px-6 py-3 text-sm text-mist">Los consejos de la sala aparecerán aquí a medida que la gente escriba.</p>;
  }
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden py-3">
      <div className="marquee flex w-max gap-12 whitespace-nowrap">
        {doubled.map((q, i) => (
          <span key={`${q.seq}-${i}`} className="text-sm">
            <span className="mr-2 font-mono text-xs text-gyellow">#{q.seq}</span>
            <span className="text-paper/90">“{q.advice}”</span>
            {q.year ? <span className="ml-2 text-xs text-mist">{q.year}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}
