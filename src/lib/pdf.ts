import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type PatientLike = {
  mrn: string;
  firstName: string;
  lastName: string;
  dob: Date;
  sex: string | null;
  primaryDx: string | null;
  primaryDxIcd: string | null;
  codeStatus: string;
  levelOfCare: string;
  admittedAt: Date;
};

type NoteLike = {
  createdAt: Date;
  signed: boolean;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  author?: { name: string; role: string };
};

type MedLike = {
  name: string;
  dose: string;
  route: string | null;
  frequency: string | null;
  controlled: boolean;
};

export type ChartPdfInput = {
  patient: PatientLike;
  meds: MedLike[];
  notes: NoteLike[];
};

export async function buildChartPdf(input: ChartPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([612, 792]); // US Letter
  let y = 750;
  const margin = 50;
  const width = 612 - margin * 2;

  const teal = rgb(0.06, 0.46, 0.43);
  const slate = rgb(0.1, 0.12, 0.18);
  const muted = rgb(0.4, 0.45, 0.51);

  function ensure(lines: number) {
    if (y - lines * 14 < 50) {
      page = doc.addPage([612, 792]);
      y = 750;
    }
  }

  function heading(text: string, color = teal) {
    ensure(2);
    page.drawText(text, { x: margin, y, size: 14, font: bold, color });
    y -= 18;
  }

  function line(text: string, color = slate, size = 10) {
    ensure(1);
    const wrapped = wrap(text, font, size, width);
    for (const w of wrapped) {
      page.drawText(w, { x: margin, y, size, font, color });
      y -= size + 4;
    }
  }

  function kv(k: string, v: string) {
    ensure(1);
    page.drawText(k, { x: margin, y, size: 10, font: bold, color: muted });
    page.drawText(v, { x: margin + 130, y, size: 10, font, color: slate });
    y -= 14;
  }

  // Header
  page.drawRectangle({ x: 0, y: 760, width: 612, height: 32, color: teal });
  page.drawText("Hospice EMR — Patient Chart Summary", {
    x: margin,
    y: 770,
    size: 14,
    font: bold,
    color: rgb(1, 1, 1),
  });
  y = 740;

  // Patient demographics
  heading(`${input.patient.firstName} ${input.patient.lastName}`);
  kv("MRN", input.patient.mrn);
  kv("DOB", input.patient.dob.toISOString().slice(0, 10));
  kv("Sex", input.patient.sex ?? "—");
  kv("Primary Dx", `${input.patient.primaryDx ?? "—"}${input.patient.primaryDxIcd ? ` (${input.patient.primaryDxIcd})` : ""}`);
  kv("Code Status", input.patient.codeStatus.replace(/_/g, "/"));
  kv("Level of Care", input.patient.levelOfCare.replace(/_/g, " "));
  kv("Admitted", input.patient.admittedAt.toISOString().slice(0, 10));
  y -= 6;

  // Medications
  heading("Active Medications");
  if (input.meds.length === 0) {
    line("None on file.", muted);
  }
  for (const m of input.meds) {
    line(
      `• ${m.name} ${m.dose}${m.route ? ` ${m.route}` : ""}${m.frequency ? ` ${m.frequency}` : ""}${m.controlled ? "  [controlled]" : ""}`
    );
  }
  y -= 6;

  // Notes
  heading("Clinical Notes");
  for (const n of input.notes) {
    ensure(6);
    line(
      `${n.createdAt.toISOString().slice(0, 16).replace("T", " ")}  ·  ${n.author?.name ?? ""} (${n.author?.role ?? ""})${n.signed ? "  ✓ signed" : "  [draft]"}`,
      muted,
      9
    );
    if (n.subjective) line(`S: ${n.subjective}`);
    if (n.objective) line(`O: ${n.objective}`);
    if (n.assessment) line(`A: ${n.assessment}`);
    if (n.plan) line(`P: ${n.plan}`);
    y -= 6;
  }

  // Footer
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} — Page ${i + 1}/${pages.length}`,
      { x: margin, y: 30, size: 8, font, color: muted }
    );
    p.drawText("CONFIDENTIAL — PHIPA-protected health information", {
      x: 612 - margin - 220,
      y: 30,
      size: 8,
      font,
      color: muted,
    });
  });

  return doc.save();
}

function wrap(text: string, font: import("pdf-lib").PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [text];
}
