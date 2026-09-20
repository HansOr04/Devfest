import { jsPDF } from "jspdf";
import {
  BRAND,
  EVENT,
  badgesFor,
  decadeOf,
  languageById,
  DECADE_LABELS,
  type CardDetail,
} from "@devfest/shared";

/**
 * Participation certificate, A4 landscape, generated entirely in the browser.
 * The name never leaves the device: the wall stays anonymous, the PDF is personal.
 */

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

function wrap(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

export interface CertificateInput extends CardDetail {
  name: string;
}

/**
 * Sticker art goes through a canvas before it reaches the PDF: the files on disk are
 * palette PNGs with transparency, which jsPDF does not read reliably, and the canvas
 * hands back a plain RGBA data URL it always understands. A sticker that fails to
 * load is simply skipped, so a missing file never blocks the certificate.
 */
async function loadArt(url: string): Promise<string | null> {
  if (typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const done = (v: string | null) => resolve(v);
    img.onload = () => {
      try {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return done(null);
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        done(canvas.toDataURL("image/png"));
      } catch {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = url;
    setTimeout(() => done(null), 3000);
  });
}

export async function buildCertificate(data: CertificateInput): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;
  const M = 16;

  doc.setFillColor(...hex(BRAND.paper));
  doc.rect(0, 0, W, H, "F");

  // Corner brackets, the DevFest visual signature
  const bracket = (x: number, y: number, dx: number, dy: number, color: string) => {
    doc.setDrawColor(...hex(color));
    doc.setLineWidth(2.2);
    doc.line(x, y, x + dx * 22, y);
    doc.line(x, y, x, y + dy * 22);
  };
  bracket(M, M, 1, 1, BRAND.blue);
  bracket(W - M, M, -1, 1, BRAND.red);
  bracket(M, H - M, 1, -1, BRAND.green);
  bracket(W - M, H - M, -1, -1, BRAND.yellow);

  // Google dots
  const dots = [BRAND.blue, BRAND.red, BRAND.yellow, BRAND.green];
  dots.forEach((c, i) => {
    doc.setFillColor(...hex(c));
    doc.circle(M + 10 + i * 7, M + 16, 2.6, "F");
  });

  doc.setTextColor(...hex(BRAND.ink));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(EVENT.chapter.toUpperCase(), M + 10, M + 27);

  doc.setFontSize(30);
  doc.text(EVENT.name, M + 10, M + 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...hex(BRAND.blue));
  doc.text(EVENT.tagline, M + 10, M + 51);

  doc.setTextColor(120, 120, 130);
  doc.setFontSize(10);
  doc.text(`${EVENT.date}  ·  ${EVENT.venue}`, M + 10, M + 58);

  // Divider
  doc.setDrawColor(210, 208, 200);
  doc.setLineWidth(0.4);
  doc.line(M + 10, M + 64, W - M - 10, M + 64);

  const TEXT_X = M + 12;
  const COL_W = 150;

  doc.setTextColor(...hex(BRAND.ink));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Certificamos la participación de", TEXT_X, M + 74);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  const name = data.name.trim() || "Miembro de la comunidad";
  doc.text(wrap(doc, name, COL_W)[0], TEXT_X, M + 86);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 100);
  const intro = `en la actividad “${EVENT.activity}”, compartiendo su historia con la comunidad y formando parte de la palabra DEVFEST construida entre todas las personas asistentes.`;
  doc.text(wrap(doc, intro, COL_W), TEXT_X, M + 95);

  // Left column: the answers. One line each so the block always clears the footer.
  const lang = languageById(data.language);
  const dec = data.year ? decadeOf(data.year) : null;
  const fields: [string, string, string?][] = [
    ["Primer lenguaje", lang?.name ?? "—", BRAND.blue],
    ["Año", data.year ? `${data.year} · ${DECADE_LABELS[dec!]}` : "—"],
  ];
  if (data.built) fields.push(["Su primer proyecto", data.built]);
  if (data.advice) fields.push(["Su consejo a quien empieza", `“${data.advice}”`]);

  const FOOTER_Y = H - M - 18;
  const STEP = 11;
  // Sit just below the intro, but move up if a long list would reach the footer.
  let y = Math.min(M + 112, FOOTER_Y - 6 - (fields.length - 1) * STEP);
  for (const [label, value, color] of fields) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(150, 148, 158);
    doc.text(label.toUpperCase(), TEXT_X, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...(color ? hex(color) : hex(BRAND.ink)));
    doc.text(wrap(doc, value, COL_W)[0], TEXT_X, y + 5);
    y += STEP;
  }

  // Right column: commit ticket
  const bx = W - M - 82;
  const by = M + 70;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(224, 222, 214);
  doc.setLineWidth(0.6);
  const BOX_H = 50;
  doc.roundedRect(bx, by, 72, BOX_H, 4, 4, "FD");

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(150, 148, 158);
  doc.text("COMMIT", bx + 8, by + 12);
  doc.setFontSize(30);
  doc.setTextColor(...hex(BRAND.ink));
  doc.text(`#${String(data.seq).padStart(4, "0")}`, bx + 8, by + 27);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text("Su lugar exacto en el mosaico.", bx + 8, by + 37);

  // Stickers earned, under the ticket. Art when it exists, a coloured dot when it does not.
  const badges = badgesFor(data).slice(0, 3);
  const art = await Promise.all(badges.map((b) => (b.art ? loadArt(b.art) : Promise.resolve(null))));

  const STRIP_Y = by + BOX_H + 9;
  const CELL = 24;
  const stripW = badges.length * CELL;
  const stripX = bx + (72 - stripW) / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(150, 148, 158);
  doc.text("STICKERS QUE SE GANÓ", bx + 36, STRIP_Y - 4, { align: "center" });

  badges.forEach((b, i) => {
    const cx = stripX + i * CELL + CELL / 2;
    const src = art[i];
    if (src) {
      doc.addImage(src, "PNG", cx - 9, STRIP_Y, 18, 18, undefined, "FAST");
    } else {
      doc.setFillColor(...hex(b.color));
      doc.circle(cx, STRIP_Y + 9, 5, "F");
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(b.glyph.slice(0, 2), cx, STRIP_Y + 10.5, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 120);
    const lines = wrap(doc, b.name, CELL - 2).slice(0, 2);
    doc.text(lines, cx, STRIP_Y + 22, { align: "center" });
  });

  // Footer
  doc.setDrawColor(210, 208, 200);
  doc.setLineWidth(0.4);
  doc.line(TEXT_X, FOOTER_Y, W - M - 12, FOOTER_Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 148, 158);
  doc.text(`${EVENT.chapter} · ${EVENT.site}`, TEXT_X, FOOTER_Y + 6);
  doc.text(`${EVENT.date} · ${EVENT.venue}`, W - M - 12, FOOTER_Y + 6, { align: "right" });

  return doc;
}

export async function downloadCertificate(data: CertificateInput) {
  const doc = await buildCertificate(data);
  doc.save(`devfest-quito-2026-commit-${String(data.seq).padStart(4, "0")}.pdf`);
}

export async function printCertificate(data: CertificateInput) {
  const doc = await buildCertificate(data);
  doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url as unknown as string, "_blank");
}
