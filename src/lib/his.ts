import { prisma } from "./prisma";

// Hospice Item Set (HIS) quality measures — simplified versions
// Real HIS requires CMS-specified time windows & data points.
// These approximate the spirit for portfolio purposes.

export type Measure = {
  key: string;
  label: string;
  description: string;
  numerator: number;
  denominator: number;
  rate: number; // 0-100
};

export async function computeHisMeasures(): Promise<Measure[]> {
  const measures: Measure[] = [];

  const activePatients = await prisma.patient.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      esasScores: { orderBy: { recordedAt: "desc" } },
      meds: { where: { discontinuedAt: null } },
      clinicalNotes: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  const total = activePatients.length || 1;

  // M1: Pain screening on admission
  const m1Num = activePatients.filter((p) => p.esasScores.length > 0).length;
  measures.push({
    key: "pain-screening",
    label: "Pain Screening",
    description: "Patients with at least one ESAS pain score recorded",
    numerator: m1Num,
    denominator: total,
    rate: round((m1Num / total) * 100),
  });

  // M2: Pain controlled (most recent pain ≤ 4)
  const withPain = activePatients.filter((p) => p.esasScores.length > 0);
  const m2Num = withPain.filter((p) => p.esasScores[0].pain <= 4).length;
  measures.push({
    key: "pain-controlled",
    label: "Pain Controlled (≤4/10)",
    description: "Patients with most recent pain score ≤ 4",
    numerator: m2Num,
    denominator: withPain.length || 1,
    rate: round((m2Num / (withPain.length || 1)) * 100),
  });

  // M3: Dyspnea screening
  const m3Num = activePatients.filter((p) => p.esasScores.length > 0 && p.esasScores[0].shortBreath !== null).length;
  measures.push({
    key: "dyspnea-screening",
    label: "Dyspnea Screening",
    description: "Patients with shortness-of-breath assessment recorded",
    numerator: m3Num,
    denominator: total,
    rate: round((m3Num / total) * 100),
  });

  // M4: Opioid + bowel regimen
  // Patients on regular opioids should have laxative ordered.
  const opioidNames = ["morphine", "hydromorphone", "fentanyl", "oxycodone", "methadone"];
  const laxativeNames = ["senna", "docusate", "polyethylene glycol", "miralax", "bisacodyl", "lactulose"];
  const onOpioid = activePatients.filter((p) =>
    p.meds.some((m) => opioidNames.some((o) => m.name.toLowerCase().includes(o)))
  );
  const m4Num = onOpioid.filter((p) =>
    p.meds.some((m) => laxativeNames.some((l) => m.name.toLowerCase().includes(l)))
  ).length;
  measures.push({
    key: "opioid-bowel-regimen",
    label: "Opioid + Bowel Regimen",
    description: "Patients on opioids with a laxative ordered",
    numerator: m4Num,
    denominator: onOpioid.length || 1,
    rate: round((m4Num / (onOpioid.length || 1)) * 100),
  });

  // M5: Recent visit (within 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const m5Num = activePatients.filter((p) =>
    p.clinicalNotes.length > 0 && p.clinicalNotes[0].createdAt > sevenDaysAgo
  ).length;
  measures.push({
    key: "recent-contact",
    label: "Visited in Last 7 Days",
    description: "Active patients with a note in the last 7 days",
    numerator: m5Num,
    denominator: total,
    rate: round((m5Num / total) * 100),
  });

  // M6: Consent on file
  const m6Num = activePatients.filter((p) => p.consentOnFile).length;
  measures.push({
    key: "consent",
    label: "Consent on File",
    description: "Active patients with documented consent",
    numerator: m6Num,
    denominator: total,
    rate: round((m6Num / total) * 100),
  });

  // M7: Signed notes (within last 24h of creation)
  const recentNotes = await prisma.note.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    select: { signed: true },
  });
  const m7Num = recentNotes.filter((n) => n.signed).length;
  measures.push({
    key: "signed-notes",
    label: "Notes Signed",
    description: "Notes signed within last 30 days",
    numerator: m7Num,
    denominator: recentNotes.length || 1,
    rate: round((m7Num / (recentNotes.length || 1)) * 100),
  });

  return measures;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
