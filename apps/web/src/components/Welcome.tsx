import { useState } from "react";
import { motion } from "framer-motion";
import { BRAND_SEQUENCE, EVENT, STATIONS } from "@devfest/shared";
import BrandMark from "./BrandMark";

/**
 * First thing a person sees. Three short slides that explain why they are here
 * before asking anything. Shown once per device and skippable at any point.
 */

const SLIDES = [
  {
    key: "hola",
    title: "Todos empezamos con un primer proyecto",
    body: "Uno feo, roto, que probablemente ya no existe. Hoy vamos a recordarlo entre todos.",
  },
  {
    key: "como",
    title: "Cinco preguntas a lo largo del día",
    body: "Se abren una por una desde el escenario. Son cortas: te toma menos de un minuto cada una.",
  },
  {
    key: "muro",
    title: "Tus respuestas forman la palabra DEVFEST",
    body: "Cada persona es un cuadro del mosaico en la pantalla grande. Al terminar te llevas tu certificado.",
  },
] as const;

export default function Welcome({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  return (
    <main className="screen flex flex-col bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-6 pt-8 safe-top safe-bottom">
        <header className="flex items-center justify-between">
          <BrandMark size={26} />
          <button type="button" onClick={onDone} className="px-2 py-1 text-sm text-mist transition hover:text-paper">
            Saltar
          </button>
        </header>

        <div className="flex flex-1 flex-col justify-center">
          {i === 0 ? <PixelWord /> : null}
          {i === 1 ? <StationList /> : null}
          {i === 2 ? <MosaicHint /> : null}

          <motion.div key={slide.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-mist">{EVENT.name}</p>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{slide.title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-mist">{slide.body}</p>
          </motion.div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex justify-center gap-2" aria-hidden="true">
            {SLIDES.map((s, n) => (
              <span
                key={s.key}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: n === i ? 22 : 8,
                  background: n === i ? BRAND_SEQUENCE[n % 4] : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? onDone() : setI(i + 1))}
            className="w-full rounded-2xl bg-white py-4 text-base font-semibold text-ink transition active:scale-[0.98]"
          >
            {last ? "Empezar" : "Siguiente"}
          </button>
          <p className="text-center text-xs text-mist">
            {EVENT.date} · {EVENT.venue}
          </p>
        </div>
      </div>
    </main>
  );
}

/** Slide 1: the word drawn in brand colours, one square at a time. */
function PixelWord() {
  return (
    <div className="mb-8 flex justify-center gap-1.5" aria-hidden="true">
      {"DEVFEST".split("").map((ch, n) => (
        <motion.span
          key={n}
          className="pixel flex h-9 w-9 items-center justify-center rounded text-[11px] text-ink"
          style={{ background: BRAND_SEQUENCE[n % 4] }}
          initial={{ opacity: 0, scale: 0.4, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.15 + n * 0.08, type: "spring", stiffness: 300, damping: 18 }}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  );
}

/** Slide 2: the five stations as locked rows that light up. */
function StationList() {
  return (
    <ul className="mb-8 space-y-2">
      {STATIONS.map((s, n) => (
        <motion.li
          key={s.id}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + n * 0.08 }}
        >
          <span className="pixel text-[9px] text-mist">0{s.order}</span>
          <span className="flex-1 text-sm">{s.title}</span>
          <span className="text-xs text-mist">{n === 0 ? "pronto" : "🔒"}</span>
        </motion.li>
      ))}
    </ul>
  );
}

/** Slide 3: a small mosaic that fills in. */
function MosaicHint() {
  const cells = Array.from({ length: 48 });
  return (
    <div className="mb-8 grid grid-cols-12 gap-1" aria-hidden="true">
      {cells.map((_, n) => (
        <motion.span
          key={n}
          className="aspect-square rounded-[3px]"
          style={{ background: n % 3 === 0 ? BRAND_SEQUENCE[n % 4] : "rgba(255,255,255,0.08)" }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 + n * 0.012 }}
        />
      ))}
    </div>
  );
}
