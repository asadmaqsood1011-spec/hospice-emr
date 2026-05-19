import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const url = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(q)}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return NextResponse.json({ results: [] });

  const data = await res.json();
  const concepts = data.drugGroup?.conceptGroup?.flatMap((g: { conceptProperties?: unknown[] }) => g.conceptProperties ?? []) ?? [];
  const results = concepts
    .map((c: { rxcui?: string; name?: string }) => ({ rxcui: c.rxcui, name: c.name }))
    .filter((c: { rxcui?: string; name?: string }) => c.rxcui && c.name)
    .slice(0, 12);

  return NextResponse.json({ results });
}
