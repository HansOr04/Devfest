export interface Language {
  id: string;
  name: string;
  /** short glyph to draw in tiny cells */
  glyph: string;
  color: string;
  /** Year it appeared, shown on the reveal card. */
  born?: number;
  /** One line of trivia. Shown right after someone picks this language. */
  fact?: string;
}

export const LANGUAGES: Language[] = [
  {
    id: "basic",
    name: "BASIC",
    glyph: "10",
    color: "#c084fc",
    born: 1964,
    fact: "Lo crearon en Dartmouth para que estudiantes que no eran de ingeniería pudieran programar. Bill Gates y Paul Allen fundaron Microsoft vendiendo un intérprete de BASIC.",
  },
  {
    id: "pascal",
    name: "Pascal / Turbo Pascal",
    glyph: "P",
    color: "#f472b6",
    born: 1970,
    fact: "Niklaus Wirth lo diseñó para enseñar a programar con orden. Turbo Pascal costaba 49 dólares cuando la competencia cobraba miles.",
  },
  {
    id: "c",
    name: "C",
    glyph: "C",
    color: "#60a5fa",
    born: 1972,
    fact: "Dennis Ritchie lo creó en los laboratorios Bell para reescribir Unix. Medio siglo después, Linux, Windows y tu teléfono siguen corriendo sobre C.",
  },
  {
    id: "cpp",
    name: "C++",
    glyph: "++",
    color: "#3b82f6",
    born: 1983,
    fact: "Bjarne Stroustrup lo empezó llamando “C con clases”. Hoy mueve Photoshop, los navegadores y casi todos los videojuegos que jugaste.",
  },
  {
    id: "java",
    name: "Java",
    glyph: "J",
    color: "#f97316",
    born: 1995,
    fact: "Nació con la promesa de escribir una vez y correr en todas partes. Su nombre viene del café que tomaba el equipo, y por años vino dentro de cada Nokia.",
  },
  {
    id: "csharp",
    name: "C#",
    glyph: "C#",
    color: "#a855f7",
    born: 2000,
    fact: "Lo diseñó Anders Hejlsberg, el mismo de Turbo Pascal. El nombre viene del sostenido musical: una nota más alta que C.",
  },
  {
    id: "vb",
    name: "Visual Basic",
    glyph: "VB",
    color: "#818cf8",
    born: 1991,
    fact: "Fue el primero en dejarte dibujar la ventana y después escribir el código. Miles de sistemas de oficina en la región todavía corren sobre él.",
  },
  {
    id: "php",
    name: "PHP",
    glyph: "php",
    color: "#8b5cf6",
    born: 1995,
    fact: "Rasmus Lerdorf lo hizo para contar las visitas de su página personal. Terminó sosteniendo Facebook y Wikipedia.",
  },
  {
    id: "html",
    name: "HTML + CSS",
    glyph: "<>",
    color: "#fb923c",
    born: 1993,
    fact: "Tim Berners-Lee lo inventó para compartir documentos entre físicos. Casi nadie recuerda su primer programa, pero todos recuerdan su primera página.",
  },
  {
    id: "js",
    name: "JavaScript",
    glyph: "JS",
    color: "#facc15",
    born: 1995,
    fact: "Brendan Eich escribió la primera versión en diez días. Se llama JavaScript solo por marketing: no tiene nada que ver con Java.",
  },
  {
    id: "ts",
    name: "TypeScript",
    glyph: "TS",
    color: "#3b82f6",
    born: 2012,
    fact: "Microsoft lo creó para ponerle tipos a JavaScript sin romperlo. Hoy la mayoría de proyectos nuevos en la web empiezan aquí.",
  },
  {
    id: "python",
    name: "Python",
    glyph: "Py",
    color: "#22c55e",
    born: 1991,
    fact: "Guido van Rossum lo publicó en Navidad. El nombre no viene de la serpiente sino de Monty Python, su grupo de comedia favorito.",
  },
  {
    id: "ruby",
    name: "Ruby",
    glyph: "Rb",
    color: "#ef4444",
    born: 1995,
    fact: "Yukihiro Matsumoto lo diseñó buscando que programar fuera agradable. Sobre Rails nacieron Twitter, GitHub y Shopify.",
  },
  {
    id: "go",
    name: "Go",
    glyph: "Go",
    color: "#06b6d4",
    born: 2009,
    fact: "Tres ingenieros de Google lo crearon mientras esperaban que compilara un programa en C++. Querían algo que compilara en segundos.",
  },
  {
    id: "rust",
    name: "Rust",
    glyph: "Rs",
    color: "#f59e0b",
    born: 2010,
    fact: "Empezó como proyecto personal de un ingeniero de Mozilla. Lleva años siendo el lenguaje más querido en las encuestas de desarrolladores.",
  },
  {
    id: "kotlin",
    name: "Kotlin",
    glyph: "Kt",
    color: "#a78bfa",
    born: 2011,
    fact: "Lo hizo JetBrains y lleva el nombre de una isla rusa. En 2017 Google lo volvió oficial para Android.",
  },
  {
    id: "swift",
    name: "Swift",
    glyph: "Sw",
    color: "#f97316",
    born: 2014,
    fact: "Apple lo presentó para reemplazar a Objective-C. Chris Lattner lo empezó en secreto, en su tiempo libre.",
  },
  {
    id: "dart",
    name: "Dart / Flutter",
    glyph: "Dt",
    color: "#0ea5e9",
    born: 2011,
    fact: "Google lo creó pensando en reemplazar a JavaScript. No lo logró, pero con Flutter se volvió la forma de hacer apps para todo a la vez.",
  },
  {
    id: "scratch",
    name: "Scratch",
    glyph: "Sc",
    color: "#fbbf24",
    born: 2007,
    fact: "El MIT lo hizo para que los niños programaran arrastrando bloques. Millones de desarrolladores empezaron moviendo ese gato naranja.",
  },
  {
    id: "lua",
    name: "Lua",
    glyph: "Lu",
    color: "#6366f1",
    born: 1993,
    fact: "Nació en Brasil, en la universidad católica de Río. Es el cerebro de World of Warcraft y de Roblox.",
  },
  {
    id: "sql",
    name: "SQL",
    glyph: "SQL",
    color: "#14b8a6",
    born: 1974,
    fact: "IBM lo inventó para hablarle a las bases de datos en algo parecido al inglés. Cincuenta años después sigue siendo la forma de preguntarle cosas a los datos.",
  },
  {
    id: "excel",
    name: "Excel / VBA",
    glyph: "xl",
    color: "#16a34a",
    born: 1993,
    fact: "Las macros fueron la puerta de entrada de muchísima gente que no sabía que estaba programando. Es el lenguaje más usado del mundo sin llamarse lenguaje.",
  },
  {
    id: "asm",
    name: "Assembler",
    glyph: "asm",
    color: "#94a3b8",
    born: 1949,
    fact: "Es lo más cerca que puedes estar de hablarle a la máquina. Los juegos de Atari y NES se escribieron así, instrucción por instrucción.",
  },
  {
    id: "matlab",
    name: "MATLAB",
    glyph: "M",
    color: "#f97316",
    born: 1984,
    fact: "Lo creó un profesor de matemáticas para que sus alumnos usaran álgebra lineal sin escribir Fortran. Vive en toda la ingeniería.",
  },
  {
    id: "other",
    name: "Otro",
    glyph: "?",
    color: "#9ca3af",
    fact: "Cada camino cuenta. Lo importante no fue la herramienta, fue que decidiste empezar.",
  },
];

export function languageById(id: string | undefined): Language | undefined {
  return id ? LANGUAGES.find((l) => l.id === id) : undefined;
}
