// Simple linear-trend decline predictor for hospice patients.
// Not ML — just slope of recent PPS + key ESAS symptoms.
// In a real clinical setting this would inform conversation, not alone trigger action.

import { prisma } from "./prisma";

export type DeclineSignal = {
  patientId: string;
  patientName: string;
  ppsSlope: number; // points per day (negative = declining)
  symptomSlope: number; // points per day for pain+SOB+fatigue average (positive = worsening)
  daysObserved: number;
  flag: "imminent" | "declining" | "stable";
  latestPps: number | null;
};

export async function computeDeclineSignals(): Promise<DeclineSignal[]> {
  const patients = await prisma.patient.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      ppsScores: { orderBy: { recordedAt: "asc" }, take: 30 },
      esasScores: { orderBy: { recordedAt: "asc" }, take: 30 },
    },
  });

  return patients.map((p) => {
    const ppsSlope = slope(p.ppsScores.map((s) => [s.recordedAt.getTime(), s.score]));
    const symptomPts = p.esasScores.map((s) => [
      s.recordedAt.getTime(),
      (s.pain + s.shortBreath + s.tiredness) / 3,
    ] as [number, number]);
    const symptomSlope = slope(symptomPts);

    const oldest = Math.min(
      ...(p.ppsScores[0] ? [p.ppsScores[0].recordedAt.getTime()] : [Date.now()]),
      ...(p.esasScores[0] ? [p.esasScores[0].recordedAt.getTime()] : [Date.now()])
    );
    const daysObserved = Math.max(1, Math.round((Date.now() - oldest) / 86400000));
    const latestPps = p.ppsScores.at(-1)?.score ?? null;

    // points-per-day → points-per-week scale
    const ppsPerWeek = ppsSlope * 86400000 * 7;
    const symPerWeek = symptomSlope * 86400000 * 7;

    let flag: DeclineSignal["flag"] = "stable";
    if (latestPps !== null && latestPps <= 30) flag = "imminent";
    else if (ppsPerWeek < -10 || symPerWeek > 2) flag = "declining";

    return {
      patientId: p.id,
      patientName: `${p.firstName} ${p.lastName}`,
      ppsSlope: round(ppsPerWeek),
      symptomSlope: round(symPerWeek),
      daysObserved,
      flag,
      latestPps,
    };
  });
}

function slope(points: [number, number][]): number {
  // Least-squares slope of y vs x
  if (points.length < 2) return 0;
  const n = points.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
