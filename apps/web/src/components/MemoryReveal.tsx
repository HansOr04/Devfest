import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DECADE_COLORS,
  DECADE_LABELS,
  MAX_YEAR,
  MIN_YEAR,
  decadeOf,
  languageById,
  type StationId,
} from "@devfest/shared";
import { api, type EchoItem, type EchoResponse } from "../lib/api";

interface Props {
  station: StationId;
  fact?: string;
  language?: string;
  year?: string;
  /** What this person just answered, echoed back to them. */
  answer?: string;
  seq: number;
  onClose: () => void;
}

const TITLES: Record<StationId, string> = {
  language: "Ahí empezó todo",
  year: "Volvamos a ese año",
  built: "Tu primera creación",
  broke: "Todos rompimos algo",
  advice: "Alguien va a leer esto",
};

const OTHERS_LABEL: Record<StationId, string> = {
  language: "",
  year: "",
  built: "Lo que construyó la sala",
  broke: "A ellos también les pasó",
  advice: "Consejos que están llegando",
};

const MINE_LABEL: Record<StationId, string> = {
  language: "",
  year: "",
  built: "Tu primer proyecto",
  broke: "Lo que te pasó",
  advice: "Tu consejo",
};

/**
 * The beat between stations. Stations open one at a time, so this only ever shows
 * what the room has actually answered by now: aggregates for the two choice
 * questions, and other people's answers to the very same question for the rest.
 */
export default function MemoryReveal({ station, fact, language, year, answer, seq, onClose }: Props) {
  const [data, setData] = useState<EchoResponse | null>(null);
  const lang = languageById(language);
  const dec = year ? decadeOf(Number(year)) : null;
  const accent = dec ? DECADE_COLORS[dec] : (lang?.color ?? "#4285F4");
  const isText = station === "built" || station === "broke" || station === "advice";

  useEffect(() => {
    let alive = true;
    api
      .echo(station, { language, year, seq })
      .then((d) => alive && setData(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [station, language, year, seq]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total = station === "year" ? data?.sameYear : station === "language" ? data?.sameLanguage : undefined;
  const others = Math.max(0, (total ?? 0) - 1);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border bg-ink-2 text-paper shadow-2xl safe-bottom"
          style={{ borderColor: `${accent}55` }}
          initial={{ y: 40, scale: 0.96, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={TITLES[station]}
        >
          <div className="h-1.5 w-full" style={{ background: accent }} />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist">{TITLES[station]}</p>
            </div>

            {/* --- Station 1: the language you picked ----------------------------- */}
            {station === "language" && lang ? (
              <div className="rise rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-3">
                  {lang.glyph.toLowerCase() !== lang.name.toLowerCase() ? (
                    <span className="font-mono text-3xl font-bold leading-none" style={{ color: lang.color }}>
                      {lang.glyph}
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-tight" style={{ color: lang.color }}>
                      {lang.name}
                    </p>
                    {lang.born ? <p className="font-mono text-xs text-mist">desde {lang.born}</p> : null}
                  </div>
                </div>
                {lang.fact ? (
                  <p className="text-[15px] leading-relaxed">
                    <span className="font-semibold" style={{ color: lang.color }}>
                      ¿Sabías que…{" "}
                    </span>
                    {lang.fact}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* --- Station 2: the year ------------------------------------------- */}
            {station === "year" && fact ? (
              <div className="rise rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="mb-1 font-mono text-3xl font-bold" style={{ color: accent }}>
                  {year}
                </p>
                <p className="text-[15px] leading-relaxed">{fact}</p>
                {dec ? <p className="mt-2 text-xs text-mist">Eres de {DECADE_LABELS[dec]}.</p> : null}
              </div>
            ) : null}

            {(station === "language" || station === "year") && typeof total === "number" && total > 0 ? (
              <p className="rise text-center text-sm leading-relaxed text-mist" style={{ animationDelay: "120ms" }}>
                {station === "language" ? (
                  others === 0 ? (
                    <>
                      Eres la primera persona que elige{" "}
                      <span className="text-paper">{lang?.name ?? "este lenguaje"}</span> en esta sala.
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-lg font-bold text-paper">{total}</span>{" "}
                      {total === 1 ? "persona eligió" : "personas eligieron"}{" "}
                      <span className="text-paper">{lang?.name ?? "lo mismo"}</span>. No empezaste solo.
                    </>
                  )
                ) : others === 0 ? (
                  <>
                    Eres la única persona que empezó en <span className="text-paper">{year}</span>. Tu año es único
                    aquí.
                  </>
                ) : (
                  <>
                    <span className="font-mono text-lg font-bold text-paper">{others}</span>{" "}
                    {others === 1 ? "persona más empezó" : "personas más empezaron"} en{" "}
                    <span className="text-paper">{year}</span>.
                  </>
                )}
              </p>
            ) : null}

            {station === "language" && data?.top?.length ? (
              <div className="rise rounded-2xl border border-white/10 bg-white/5 p-4" style={{ animationDelay: "220ms" }}>
                <p className="mb-3 text-[11px] uppercase tracking-widest text-mist">Lo más elegido en la sala</p>
                <ul className="space-y-2">
                  {data.top.map((t) => {
                    const l = languageById(t.id);
                    const max = data.top[0].n || 1;
                    return (
                      <li key={t.id} className="flex items-center gap-3 text-sm">
                        <span className="w-24 shrink-0 truncate" style={{ color: l?.color }}>
                          {l?.name ?? t.id}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full transition-[width] duration-700"
                            style={{ width: `${Math.round((t.n / max) * 100)}%`, background: l?.color ?? "#888" }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-right font-mono text-xs text-mist">{t.n}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {station === "year" && data?.oldest ? (
              <Timeline
                you={Number(year)}
                oldest={data.oldest.year}
                newest={data.oldest.newest}
                before={data.oldest.before}
                total={data.oldest.total}
                accent={accent}
              />
            ) : null}

            {/* --- Stations 3 to 5: your answer, then the room's ------------------ */}
            {isText && answer ? (
              <div
                className="rise relative overflow-hidden rounded-2xl border p-4"
                style={{ borderColor: `${accent}55`, background: `${accent}14` }}
              >
                <p className="mb-2 text-[11px] uppercase tracking-widest" style={{ color: accent }}>
                  {MINE_LABEL[station]}
                </p>
                <p className="text-[15px] leading-relaxed">{answer}</p>
                <p className="mt-2 font-mono text-xs text-mist">
                  guardado en el commit #{String(seq).padStart(4, "0")}
                </p>
              </div>
            ) : null}

            {isText && data ? (
              <p className="rise text-center text-sm text-mist" style={{ animationDelay: "120ms" }}>
                {data.answered <= 1 ? (
                  <>Eres de las primeras personas en responder esta pregunta.</>
                ) : (
                  <>
                    <span className="font-mono text-lg font-bold text-paper">{data.answered}</span> personas ya
                    respondieron esta pregunta.
                  </>
                )}
              </p>
            ) : null}

            {isText && data?.echoes?.length ? (
              <div className="rise space-y-2.5" style={{ animationDelay: "220ms" }}>
                <p className="text-[11px] uppercase tracking-widest text-mist">{OTHERS_LABEL[station]}</p>
                {data.echoes.map((e, i) => (
                  <EchoRow key={e.seq} item={e} station={station} delay={i * 90} />
                ))}
              </div>
            ) : null}

            {station === "advice" ? (
              <p className="rise text-center text-sm leading-relaxed text-mist" style={{ animationDelay: "320ms" }}>
                Tu consejo va a pasar por la pantalla grande. Alguien que empieza hoy lo va a leer.
              </p>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl py-3.5 text-base font-medium text-white transition active:scale-[0.98]"
              style={{ background: accent }}
            >
              Seguir
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function EchoRow({ item, station, delay }: { item: EchoItem; station: StationId; delay: number }) {
  const l = languageById(item.language);
  const d = item.year ? decadeOf(item.year) : null;
  return (
    <div
      className="rise rounded-2xl border border-white/10 bg-white/5 p-3.5"
      style={{ animationDelay: `${240 + delay}ms` }}
    >
      <p className={`text-[15px] leading-relaxed ${station === "advice" ? "italic" : ""}`}>
        {station === "advice" ? `“${item.text}”` : item.text}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-mist">
        <span>#{String(item.seq).padStart(4, "0")}</span>
        {l ? (
          <>
            <span aria-hidden="true">·</span>
            <span style={{ color: l.color }}>{l.name}</span>
          </>
        ) : null}
        {item.year ? (
          <>
            <span aria-hidden="true">·</span>
            <span style={{ color: d ? DECADE_COLORS[d] : undefined }}>{item.year}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Where this person sits between the earliest and the latest start in the room. */
function Timeline({
  you,
  oldest,
  newest,
  before,
  total,
  accent,
}: {
  you: number;
  oldest: number;
  newest: number;
  before: number;
  total: number;
  accent: string;
}) {
  const lo = Math.min(oldest, you, MAX_YEAR);
  const hi = Math.max(newest, you, MIN_YEAR);
  const span = Math.max(1, hi - lo);
  const pct = Math.round(((you - lo) / span) * 100);
  const ahead = Math.max(0, total - before - 1);

  return (
    <div className="rise rounded-2xl border border-white/10 bg-white/5 p-4" style={{ animationDelay: "220ms" }}>
      <p className="mb-4 text-[11px] uppercase tracking-widest text-mist">Las generaciones de esta sala</p>

      <div className="relative mb-2 h-2 rounded-full bg-gradient-to-r from-[#a78bfa] via-[#4285F4] to-[#FBBC04]">
        <span
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink-2 pulse-ring"
          style={{ left: `${pct}%`, background: accent }}
          aria-label={`Tú empezaste en ${you}`}
        />
      </div>
      <div className="flex justify-between font-mono text-[11px] text-mist">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>

      <p className="mt-3 text-[15px] leading-relaxed">
        {before > 0 && ahead > 0 ? (
          <>
            <span className="font-mono font-bold text-paper">{before}</span> personas empezaron antes que tú y{" "}
            <span className="font-mono font-bold text-paper">{ahead}</span> después. Estás justo en medio de dos
            generaciones.
          </>
        ) : before === 0 ? (
          <>Eres de quienes empezaron primero. Todo lo que ves hoy se construyó sobre tu generación.</>
        ) : (
          <>Eres de quienes empezaron hace poco. La gente de {lo} estaba donde tú estás ahora.</>
        )}
      </p>
      <p className="mt-2 text-xs text-mist">
        {hi - lo} años separan a la primera persona de la última. Hoy están en la misma sala.
      </p>
    </div>
  );
}
