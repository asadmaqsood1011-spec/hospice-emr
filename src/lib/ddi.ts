// Drug-drug interaction checker.
// Combines local hospice-specific rules with OpenFDA's drug label data.
// OpenFDA: https://open.fda.gov/apis/drug/label/
// No API key required for basic use.

export type DDIAlert = {
  severity: "high" | "moderate" | "low";
  drugA: string;
  drugB: string;
  message: string;
  source: "hospice-rules" | "openfda";
};

const OPIOIDS = ["morphine", "hydromorphone", "fentanyl", "oxycodone", "methadone", "hydrocodone", "codeine"];
const BENZOS = ["lorazepam", "midazolam", "diazepam", "alprazolam", "clonazepam"];
const ANTICHOLINERGICS = ["scopolamine", "atropine", "glycopyrrolate", "hyoscine"];
const CNS_DEPRESSANTS = ["haloperidol", "chlorpromazine", "phenobarbital"];

function isIn(med: string, list: string[]): boolean {
  const n = med.toLowerCase();
  return list.some((x) => n.includes(x));
}

export function hospiceRules(meds: string[]): DDIAlert[] {
  const alerts: DDIAlert[] = [];
  const lower = meds.map((m) => m.toLowerCase());

  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const a = meds[i];
      const b = meds[j];
      const an = lower[i];
      const bn = lower[j];

      // Opioid + Benzo = FDA black box (CNS depression)
      if (
        (OPIOIDS.some((o) => an.includes(o)) && BENZOS.some((b) => bn.includes(b))) ||
        (OPIOIDS.some((o) => bn.includes(o)) && BENZOS.some((b) => an.includes(b)))
      ) {
        alerts.push({
          severity: "high",
          drugA: a,
          drugB: b,
          message:
            "Opioid + benzodiazepine: FDA black box warning. Profound sedation, respiratory depression, coma, death. In hospice this combination is sometimes intentional for refractory dyspnea/anxiety — document goals of care and titrate carefully.",
          source: "hospice-rules",
        });
      }

      // Two opioids overlapping
      if (OPIOIDS.some((o) => an.includes(o)) && OPIOIDS.some((o) => bn.includes(o))) {
        alerts.push({
          severity: "moderate",
          drugA: a,
          drugB: b,
          message:
            "Two opioids ordered. Verify one is for breakthrough only. Calculate total morphine equivalent daily dose (MEDD).",
          source: "hospice-rules",
        });
      }

      // Opioid + anticholinergic worsens constipation, urinary retention
      if (
        (OPIOIDS.some((o) => an.includes(o)) && ANTICHOLINERGICS.some((x) => bn.includes(x))) ||
        (OPIOIDS.some((o) => bn.includes(o)) && ANTICHOLINERGICS.some((x) => an.includes(x)))
      ) {
        alerts.push({
          severity: "moderate",
          drugA: a,
          drugB: b,
          message:
            "Opioid + anticholinergic: additive constipation and urinary retention. Ensure bowel regimen ordered.",
          source: "hospice-rules",
        });
      }

      // Multiple CNS depressants
      if (CNS_DEPRESSANTS.some((d) => an.includes(d)) && CNS_DEPRESSANTS.some((d) => bn.includes(d))) {
        alerts.push({
          severity: "moderate",
          drugA: a,
          drugB: b,
          message: "Multiple CNS depressants. Watch for over-sedation.",
          source: "hospice-rules",
        });
      }
    }
  }

  return alerts;
}

export async function openFdaInteractions(meds: string[]): Promise<DDIAlert[]> {
  const alerts: DDIAlert[] = [];
  // For each unique med, query OpenFDA for drug_interactions section.
  // This is approximate — OpenFDA returns text, not structured pairs.
  for (const med of meds.slice(0, 8)) {
    try {
      const q = encodeURIComponent(`openfda.generic_name:"${med.toLowerCase()}"+OR+openfda.brand_name:"${med.toLowerCase()}"`);
      const url = `https://api.fda.gov/drug/label.json?search=${q}&limit=1`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (!res.ok) continue;
      const data = await res.json();
      const interactions = data.results?.[0]?.drug_interactions?.[0];
      if (!interactions) continue;

      // Naive match: any other med name appearing in the interactions text
      for (const other of meds) {
        if (other === med) continue;
        if (interactions.toLowerCase().includes(other.toLowerCase().split(" ")[0])) {
          alerts.push({
            severity: "moderate",
            drugA: med,
            drugB: other,
            message: truncate(interactions, 280),
            source: "openfda",
          });
        }
      }
    } catch {
      // Best-effort. Don't block on OpenFDA failure.
    }
  }
  return dedupe(alerts);
}

export async function checkInteractions(meds: string[]): Promise<DDIAlert[]> {
  const [a, b] = await Promise.all([Promise.resolve(hospiceRules(meds)), openFdaInteractions(meds)]);
  return dedupe([...a, ...b]);
}

function dedupe(alerts: DDIAlert[]): DDIAlert[] {
  const seen = new Set<string>();
  return alerts.filter((a) => {
    const key = [a.drugA, a.drugB].sort().join("|") + a.message.slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
