/**
 * Fills the wall with fake participants to rehearse the big screen.
 *   pnpm --filter @devfest/api seed 350
 * Never run against the production database during the event.
 */
import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { LANGUAGES } from "@devfest/shared";

const count = Number(process.argv[2] ?? 300);
const sql = postgres(process.env.DATABASE_URL ?? "postgres://devfest:devfest@localhost:5442/devfest");

const BUILT = [
  "Una calculadora en consola que solo sumaba",
  "Un juego de adivinar el número",
  "La página de mi banda con GIFs animados",
  "Un bot de Telegram que respondía hola",
  "Un sistema de notas para el colegio",
  "Un clon de Flappy Bird que nunca terminé",
  "Un formulario de contacto que enviaba mails a nadie",
  "Una macro de Excel para las notas de mi mamá",
  "Un chat en LAN para jugar con mis vecinos",
  "Un blog en WordPress con tema morado",
  "Una app de tareas, como todos",
  "Un script para descargar música",
  "Un reloj digital en la pantalla del colegio",
  "Una web con marquee y contador de visitas",
  "Un inventario para la tienda de mi tío",
];
const BROKE = [
  "Borré la carpeta pensando que era la copia",
  "Un bucle infinito que llenó el disco de logs",
  "Nunca supe qué era un puntero nulo",
  "Subí la contraseña de la base de datos a GitHub",
  "El proyecto solo funcionaba en mi computadora",
  "Perdí todo cuando formatearon el laboratorio",
  "Quise centrar un div durante tres días",
  "Cambié un igual por doble igual y tardé una semana",
  "Se cayó el día de la presentación",
  "Guardé las contraseñas en texto plano",
  "Ningún commit, todo en un solo archivo de 4000 líneas",
];
const ADVICE = [
  "No tienes que entender todo hoy",
  "Escribe el código feo primero, luego lo arreglas",
  "Pregunta más, googlea menos",
  "Los errores son la documentación real",
  "Termina el proyecto aunque sea horrible",
  "Aprende Git antes de que lo necesites",
  "Nadie nace sabiendo, todos copiamos de Stack Overflow",
  "Lo que hoy te frustra mañana será tu especialidad",
  "Guarda copias. Muchas copias.",
  "Comparte lo que haces, aunque sea pequeño",
  "El mejor lenguaje es el que te hace terminar",
  "Descansa. El bug sigue ahí mañana y tú lo verás mejor",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function year(): number {
  const r = Math.random();
  if (r < 0.08) return 1985 + Math.floor(Math.random() * 15);
  if (r < 0.3) return 2000 + Math.floor(Math.random() * 10);
  if (r < 0.72) return 2010 + Math.floor(Math.random() * 10);
  return 2020 + Math.floor(Math.random() * 7);
}

const weighted = LANGUAGES.flatMap((l) => {
  const w = ["js", "python", "java", "html", "cpp", "c", "php", "scratch"].includes(l.id) ? 5 : 1;
  return Array.from({ length: w }, () => l.id);
});

const rows = Array.from({ length: count }, () => {
  const p = Math.random();
  const done = p < 0.55 ? 5 : p < 0.7 ? 4 : p < 0.82 ? 3 : p < 0.92 ? 2 : 1;
  return {
    token: randomBytes(24).toString("hex"),
    language: pick(weighted),
    year: done >= 2 ? year() : null,
    built: done >= 3 ? pick(BUILT) : null,
    broke: done >= 4 ? pick(BROKE) : null,
    advice: done >= 5 ? pick(ADVICE) : null,
  };
});

for (let i = 0; i < rows.length; i += 500) {
  await sql`insert into participants ${sql(rows.slice(i, i + 500))}`;
}
const [{ n }] = await sql<{ n: string }[]>`select count(*)::text as n from participants`;
console.log(`+${count} participantes. Total: ${n}`);
await sql.end();
