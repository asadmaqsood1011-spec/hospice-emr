// FHIR endpoint guard.
// FHIR is a write-once-read-many integration surface that, if misconfigured,
// dumps PHI. We refuse to serve unless FEATURE_FHIR is explicitly enabled AND
// a valid FHIR_CLIENT_TOKEN is provided in the Authorization header.

import { NextResponse } from "next/server";

const FHIR_ENABLED = process.env.FEATURE_FHIR === "true";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function fhirGate(req: Request): NextResponse | null {
  if (!FHIR_ENABLED) {
    return NextResponse.json(
      {
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-supported",
            details: { text: "FHIR endpoint is disabled. Set FEATURE_FHIR=true and configure FHIR_CLIENT_TOKEN to enable." },
          },
        ],
      },
      { status: 503 }
    );
  }

  const expected = process.env.FHIR_CLIENT_TOKEN;
  if (!expected || expected.length < 32) {
    return NextResponse.json(
      {
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "security", details: { text: "FHIR server misconfigured" } }],
      },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m || !timingSafeEqual(m[1], expected)) {
    return NextResponse.json(
      {
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "security", details: { text: "Bearer token required" } }],
      },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="fhir"' } }
    );
  }

  return null; // pass
}
