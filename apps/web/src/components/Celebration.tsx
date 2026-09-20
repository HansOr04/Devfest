import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  BRAND_SEQUENCE,
  DECADE_LABELS,
  EVENT,
  badgesFor,
  decadeOf,
  languageById,
  type CardDetail,
  type WallSnapshot,
} from "@devfest/shared";
import WallCanvas from "./WallCanvas";
import StickerCard from "./StickerCard";

/** jsPDF is ~200 kB gzipped, so it only travels to phones that ask for the PDF. */
const certificate = () => import("../lib/certificate");

interface Props {
  card: CardDetail;
  snapshot: WallSnapshot | null;
  onExplore: () => void;
}

const NAME_KEY = "devfest.name";

/**
 * The finale. The word takes the whole phone, the participant's own cell pulses
 * inside it, and from here they can take their certificate home.
 */
export default function Celebration({ card, snapshot, onExplore }: Props) {
  const [stage, setStage] = useState<"wall" | "card" | "clean">("wall");
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  const fired = useRef(false);

  const badges = useMemo(() => badgesFor(card), [card]);
  const lang = languageById(card.language);
  const dec = card.year ? decadeOf(card.year) : null;

  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const colors = [...BRAND_SEQUENCE];
    const burst = (delay: number, x: number) =>
      setTimeout(() => confetti({ particleCount: 55, spread: 70, origin: { x, y: 0.75 }, colors, disableForReducedMotion: true }), delay);
    const t1 = burst(250, 0.25);
    const t2 = burst(520, 0.75);
    const t3 = burst(820, 0.5);
    return () => {
      [t1, t2, t3].forEach(clearTimeout);
    };
  }, []);

  const emit = async (mode: "download" | "print") => {
    const v = name.trim();
    if (v.length < 2) {
      setNameError("Escribe tu nombre para el certificado");
      return;
    }
    localStorage.setItem(NAME_KEY, v);
    setNameError(null);
    setBusy(true);
    try {
      const mod = await certificate();
      if (mode === "print") await mod.printCertificate({ ...card, name: v });
      else await mod.downloadCertificate({ ...card, name: v });
      setSheet(false);
    } catch {
      setNameError("No se pudo generar el PDF. Intenta otra vez.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const text = `Mi primer proyecto fue en ${lang?.name ?? "código"} (${card.year}): "${card.built}". Soy el commit #${card.seq} del muro de ${EVENT.name}.`;
    try {
      if (navigator.share) await navigator.share({ text, url: location.origin });
      else await navigator.clipboard.writeText(`${text} ${location.origin}`);
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-ink text-paper">
      {stage === "wall" ? (
        <motion.section
          key="wall"
          className="screen-fixed relative flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* The word gets the middle band; the header and the button keep their own space. */}
          <div className="absolute inset-x-0 bottom-24 top-16 sm:bottom-28 sm:top-20">
            <WallCanvas
              snapshot={snapshot}
              highlightSeq={card.seq}
              padding={portrait ? 20 : 40}
              showGlyphs={false}
              rotate={portrait}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink via-ink/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink via-ink/85 to-transparent" />

          <div className="relative z-10 flex h-full flex-col items-center justify-between px-6 py-6 safe-top safe-bottom">
            <motion.div
              className="text-center"
              initial={{ y: -14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-[11px] uppercase tracking-[0.3em] text-mist">{EVENT.name}</p>
              <p className="pixel mt-2 text-xs text-ggreen">build succeeded</p>
            </motion.div>

            <motion.div
              className="rounded-3xl border border-white/15 bg-ink/80 px-6 py-5 text-center backdrop-blur-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.55, type: "spring", stiffness: 220, damping: 22 }}
            >
              <p className="text-sm text-mist">tu lugar en la palabra</p>
              <p className="pulse-ring mt-1 inline-block rounded-xl px-3 font-mono text-5xl font-bold">
                #{String(card.seq).padStart(4, "0")}
              </p>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed">
                Uno de esos cuadros es tuyo. Los otros {Math.max(0, (snapshot?.count ?? 1) - 1)} son de la gente
                que está a tu lado.
              </p>
            </motion.div>

            <motion.div
              className="w-full max-w-sm space-y-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <button
                type="button"
                onClick={() => setStage("card")}
                className="w-full rounded-2xl bg-white py-4 text-base font-semibold text-ink transition active:scale-[0.98]"
              >
                Ver mi tarjeta y certificado
              </button>
              <button
                type="button"
                onClick={() => setStage("clean")}
                className="w-full py-2.5 text-sm text-mist transition hover:text-paper"
              >
                Ver solo la palabra
              </button>
            </motion.div>
          </div>
        </motion.section>
      ) : stage === "clean" ? (
        <CleanWall snapshot={snapshot} portrait={portrait} onExit={() => setStage("wall")} />
      ) : (
        <motion.section
          key="card"
          className="screen mx-auto w-full max-w-lg px-5 py-8 safe-top safe-bottom"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <header className="mb-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-mist">{EVENT.name}</p>
            <h2 className="pixel mt-3 text-base leading-relaxed">tu commit</h2>
            <p className="mt-2 font-mono text-5xl font-bold">#{String(card.seq).padStart(4, "0")}</p>
          </header>

          <div className="rise overflow-hidden rounded-3xl border border-white/10 bg-ink-2">
            <div className="flex h-1.5 w-full">
              {BRAND_SEQUENCE.map((c) => (
                <span key={c} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            <dl className="space-y-3 p-5 text-[15px]">
              <Row k="Lenguaje" v={lang?.name ?? "—"} color={lang?.color} />
              <Row k="Año" v={card.year ? `${card.year} · ${DECADE_LABELS[dec!]}` : "—"} />
              <Row k="Construiste" v={card.built ?? "—"} />
              <Row k="Salió mal" v={card.broke ?? "—"} />
              <Row k="Tu consejo" v={card.advice ? `“${card.advice}”` : "—"} />
            </dl>
          </div>

          {badges.length ? (
            <section className="mt-7">
              <p className="mb-3 text-center text-[11px] uppercase tracking-[0.25em] text-mist">
                stickers que te ganaste
              </p>
              <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
                {badges.map((b, i) => (
                  <StickerCard key={b.id} badge={b} index={i} />
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => setSheet(true)}
              className="w-full rounded-2xl bg-gblue py-4 text-base font-semibold text-white transition active:scale-[0.98]"
            >
              Descargar mi certificado
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void share()}
                className="rounded-2xl border border-white/15 py-3.5 text-sm font-medium transition active:scale-[0.98]"
              >
                Compartir
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="rounded-2xl border border-white/15 py-3.5 text-sm font-medium transition active:scale-[0.98]"
              >
                Explorar el muro
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setStage("wall")} className="py-2 text-sm text-mist">
                Volver a la palabra
              </button>
              <button type="button" onClick={() => setStage("clean")} className="py-2 text-sm text-mist">
                Ver solo la palabra
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-mist">
            {EVENT.date} · {EVENT.venue}
            <br />
            {EVENT.chapter} · {EVENT.tagline}
          </p>
        </motion.section>
      )}

      <AnimatePresence>
        {sheet ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-2 p-5 safe-bottom"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold">¿A nombre de quién?</h3>
              <p className="mt-1 text-sm text-mist">
                Solo se usa para imprimir el PDF. No se guarda en el muro: tu recuerdo sigue siendo anónimo.
              </p>
              <input
                className="mt-4 w-full rounded-2xl border border-white/15 bg-ink px-4 py-3 text-base text-paper"
                placeholder="Tu nombre y apellido"
                value={name}
                autoFocus
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && void emit("download")}
              />
              {nameError ? <p className="mt-2 text-sm text-gred">{nameError}</p> : null}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void emit("print")}
                  className="rounded-2xl border border-white/15 py-3.5 text-sm font-medium disabled:opacity-50"
                  disabled={busy}
                >
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => void emit("download")}
                  className="rounded-2xl bg-gblue py-3.5 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={busy}
                >
                  {busy ? "Generando…" : "Descargar PDF"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Just the word. No card, no commit number, nothing on top: the mosaic filling up
 * in real time. Tap anywhere to come back.
 */
function CleanWall({
  snapshot,
  portrait,
  onExit,
}: {
  snapshot: WallSnapshot | null;
  portrait: boolean;
  onExit: () => void;
}) {
  const [chrome, setChrome] = useState(true);

  // The counter and the exit hint fade out on their own so the word is left alone.
  useEffect(() => {
    const t = setTimeout(() => setChrome(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onExit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  return (
    <motion.section
      className="screen-fixed relative bg-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      onPointerDown={() => setChrome(true)}
    >
      <div className="absolute inset-0">
        <WallCanvas snapshot={snapshot} padding={portrait ? 16 : 32} showGlyphs={false} rotate={portrait} />
      </div>

      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5 safe-top"
        animate={{ opacity: chrome ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-mist">{EVENT.name}</p>
        <p className="text-right">
          <span className="font-mono text-2xl font-bold leading-none">
            {(snapshot?.count ?? 0).toLocaleString("es")}
          </span>
          <br />
          <span className="text-[10px] uppercase tracking-widest text-mist">recuerdos</span>
        </p>
      </motion.div>

      <motion.button
        type="button"
        onClick={onExit}
        className="absolute inset-x-0 bottom-0 px-6 pb-6 text-center text-sm text-mist safe-bottom"
        animate={{ opacity: chrome ? 1 : 0.25 }}
        transition={{ duration: 0.6 }}
      >
        Salir
      </motion.button>
    </motion.section>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-xs uppercase tracking-wider text-mist">{k}</dt>
      <dd className="flex-1 leading-snug" style={{ color }}>
        {v}
      </dd>
    </div>
  );
}
