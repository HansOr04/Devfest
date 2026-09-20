import type { Station, StationId } from "./types.js";

export const STATIONS: Station[] = [
  {
    id: "language",
    order: 1,
    title: "Tu primer lenguaje",
    prompt: "¿Con qué lenguaje escribiste tu primera línea?",
    hint: "El que sea. Scratch cuenta. Excel con macros cuenta.",
    kind: "choice",
  },
  {
    id: "year",
    order: 2,
    title: "El año",
    prompt: "¿En qué año fue?",
    hint: "Aproximado está bien. Nadie va a revisar el commit.",
    kind: "year",
  },
  {
    id: "built",
    order: 3,
    title: "Qué construiste",
    prompt: "¿Qué era ese primer proyecto?",
    hint: "Una calculadora, un juego, una página para tu banda…",
    kind: "text",
    maxLength: 80,
  },
  {
    id: "broke",
    order: 4,
    title: "Qué salió mal",
    prompt: "¿Qué rompiste, borraste o nunca lograste que funcionara?",
    hint: "Todos rompimos algo. Esta es la parte que une.",
    kind: "text",
    maxLength: 120,
  },
  {
    id: "advice",
    order: 5,
    title: "Un consejo",
    prompt: "¿Qué le dirías a esa versión tuya que estaba empezando?",
    hint: "Una línea. La vamos a mostrar en la pantalla grande.",
    kind: "text",
    maxLength: 100,
  },
];

export const STATION_IDS = STATIONS.map((s) => s.id) as StationId[];

export function stationById(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

export const MIN_YEAR = 1970;
export const MAX_YEAR = new Date().getFullYear();

export function decadeOf(year: number): "pre2000" | "2000s" | "2010s" | "2020s" {
  if (year < 2000) return "pre2000";
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "2020s";
}

export const DECADE_COLORS: Record<ReturnType<typeof decadeOf>, string> = {
  pre2000: "#a78bfa",
  "2000s": "#4285F4",
  "2010s": "#34A853",
  "2020s": "#FBBC04",
};

export const DECADE_LABELS: Record<ReturnType<typeof decadeOf>, string> = {
  pre2000: "antes del 2000",
  "2000s": "los 2000",
  "2010s": "los 2010",
  "2020s": "los 2020",
};
