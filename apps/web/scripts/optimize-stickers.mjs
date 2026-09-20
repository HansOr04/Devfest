/**
 * Sticker art comes out of the generator at ~1.2 MB each. On a venue wifi shared by
 * thousands of phones that is unacceptable, so this trims the transparent margin,
 * resizes to 320px and writes webp + a png fallback.
 *
 *   node scripts/optimize-stickers.mjs           # process src/ into public/stickers
 *   node scripts/optimize-stickers.mjs --in-place  # re-process public/stickers itself
 */
import { readdir, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

const OUT = "public/stickers";
const SRC = process.argv.includes("--in-place") ? OUT : "assets/stickers-src";
const SIZE = 320;

async function main() {
  try {
    await stat(SRC);
  } catch {
    console.error(`No existe ${SRC}. Deja los PNG originales ahí, o usa --in-place.`);
    process.exit(1);
  }
  await mkdir(OUT, { recursive: true });

  const files = (await readdir(SRC)).filter((f) => /\.(png|webp)$/i.test(f));
  if (files.length === 0) {
    console.log("No hay imágenes que procesar.");
    return;
  }

  for (const file of files) {
    const { name } = parse(file);
    const input = await readFile(join(SRC, file));
    const before = input.length;

    const base = sharp(input)
      // Drop the empty margin the generator leaves so the art fills the card.
      .trim({ threshold: 1 })
      .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

    const webp = await base.clone().webp({ quality: 82, effort: 6 }).toBuffer();
    const png = await base.clone().png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();

    await writeFile(join(OUT, `${name}.webp`), webp);
    await writeFile(join(OUT, `${name}.png`), png);

    const kb = (n) => `${Math.round(n / 1024)} kB`;
    console.log(`${name}: ${kb(before)} → webp ${kb(webp.length)} · png ${kb(png.length)}`);
  }
}

await main();
