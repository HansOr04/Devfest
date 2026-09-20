import { decadeOf } from "./stations.js";
import type { CardDetail } from "./types.js";

/**
 * Collectible badges. Everyone who finishes earns two or three, and they print on
 * the certificate. They exist so two strangers can compare cards and find something
 * in common ("¡yo también borré la carpeta!").
 */
export interface Badge {
  id: string;
  name: string;
  line: string;
  /** Tabler-free: a short mono glyph so it renders anywhere, including the PDF. */
  glyph: string;
  color: string;
  /** Optional sticker art dropped in /public/stickers. Falls back to the glyph. */
  art?: string;
}

export const BADGES: Badge[] = [
  { id: "pionero", name: "Pionero", line: "Empezaste cuando internet hacía ruido", glyph: "◄►", color: "#a78bfa", art: "/stickers/pionero.png" },
  { id: "milenial", name: "Generación CD-ROM", line: "Aprendiste con manuales fotocopiados", glyph: "◎", color: "#4285F4", art: "/stickers/cdrom.png" },
  { id: "stackoverflow", name: "Hijo de Stack Overflow", line: "Copiaste, pegaste y funcionó", glyph: "{ }", color: "#34A853", art: "/stickers/stackoverflow.png" },
  { id: "nativo", name: "Nativo de la IA", line: "Tu primer proyecto ya tuvo autocompletado", glyph: "✦", color: "#FBBC04", art: "/stickers/ia.png" },
  { id: "destructor", name: "Destructor de carpetas", line: "Borraste algo que no tenía copia", glyph: "✖", color: "#EA4335", art: "/stickers/destructor.png" },
  { id: "juego", name: "Hiciste un juego", line: "Empezaste programando para divertirte", glyph: "▶", color: "#34A853", art: "/stickers/juego.png" },
  { id: "web", name: "Webmaster", line: "Tu primera página tenía fondo con textura", glyph: "</>", color: "#4285F4", art: "/stickers/webmaster.png" },
  { id: "autodidacta", name: "Autodidacta", line: "Nadie te enseñó, te lanzaste solo", glyph: "★", color: "#FBBC04", art: "/stickers/autodidacta.png" },
  { id: "mentor", name: "Voz de la experiencia", line: "Dejaste un consejo para quien empieza", glyph: "❞", color: "#a78bfa", art: "/stickers/mentor.png" },
  { id: "completo", name: "Commit completo", line: "Respondiste las cinco estaciones", glyph: "✓", color: "#34A853", art: "/stickers/completo.png" },
];

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}

const GAME_WORDS = ["juego", "game", "jueguito", "mario", "snake", "pong", "flappy", "rpg", "videojuego"];
const WEB_WORDS = ["página", "pagina", "web", "sitio", "blog", "html", "portal"];
const BREAK_WORDS = ["borré", "borre", "eliminé", "elimine", "perdí", "perdi", "formatearon", "borrar"];

function has(text: string | undefined, words: string[]) {
  if (!text) return false;
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

/** Which badges this card earned. Pure function: same result on phone, screen and PDF. */
export function badgesFor(card: CardDetail): Badge[] {
  const out: string[] = [];
  if (card.year) {
    const d = decadeOf(card.year);
    if (d === "pre2000") out.push("pionero");
    else if (d === "2000s") out.push("milenial");
    else if (d === "2010s") out.push("stackoverflow");
    else out.push("nativo");
  }
  if (has(card.broke, BREAK_WORDS)) out.push("destructor");
  if (has(card.built, GAME_WORDS)) out.push("juego");
  else if (has(card.built, WEB_WORDS)) out.push("web");
  if (card.advice) out.push("mentor");
  if (card.language && card.year && card.built && card.broke && card.advice) out.push("completo");
  return out.map(badgeById).filter((b): b is Badge => Boolean(b)).slice(0, 4);
}
