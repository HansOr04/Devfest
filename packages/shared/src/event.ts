/** Everything about this particular edition lives here, so a future DevFest edits one file. */
export const EVENT = {
  chapter: "GDG Quito",
  name: "DevFest Quito 2026",
  tagline: "Innovating Together",
  date: "26 de septiembre de 2026",
  venue: "USFQ",
  activity: "Muro de mi primer proyecto",
  site: "gdgquito.com",
} as const;

/** Google brand ramp used across the wall, the badges and the certificate. */
export const BRAND = {
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC04",
  green: "#34A853",
  ink: "#0B0B12",
  paper: "#F4F1EA",
} as const;

export const BRAND_SEQUENCE = [BRAND.blue, BRAND.red, BRAND.yellow, BRAND.green] as const;
