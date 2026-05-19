# Hospice EMR

> Voice-first electronic medical record for hospice care. PHIPA-aware architecture. Nurse dictates → AI structures into SOAP notes → reviewed and signed in seconds.

**Status:** MVP scaffold. Not certified, not for production patient data without a Privacy Impact Assessment.

## Why This Exists

Hospices in Ontario run on paper, fax, and 2005-era EMRs. Epic and Cerner are built for acute care and cost millions. This is a small, single-clinic EMR designed around the hospice nurse home visit workflow: dictate at the bedside, AI handles the typing.

**Differentiators:**
- Voice-first: Whisper transcribes, GPT-4o structures into SOAP + extracts ESAS/PPS/meds
- Hospice-specific data model: PPS, ESAS-r, level of care, code status, prognosis attestation
- Immutable audit log on every PHI access (PHIPA-aware)
- Single-clinic deployment, multi-role RBAC (Admin/MD/RN/SW/Chaplain/Aide/Volunteer)

## Stack

- **Next.js 16** (App Router, Server Actions, Server Components)
- **TypeScript** + **Tailwind CSS 4**
- **Postgres** via **Prisma 6** (recommended host: Neon, ca-central-1 for data residency)
- **NextAuth 5** (credentials provider, JWT, 15-min idle timeout)
- **OpenAI** (Whisper + GPT-4o, JSON mode)
- **Recharts** for ESAS/PPS trends
- **Pino** logger with PHI redaction

## Setup

```bash
# 1. Install deps
npm install

# 2. Configure DB (Neon, ca-central-1)
#    Sign up at https://neon.tech → create project
#    Paste connection string into .env -> DATABASE_URL
#    Region: AWS Canada Central for PHIPA data residency

# 3. Push schema + seed
npx prisma db push
npm run db:seed

# 4. Dev server
npm run dev
# -> http://localhost:3000
```

## Demo Credentials

All passwords: `hospice123!`

| Email | Role |
|-------|------|
| `admin@clinic.test` | ADMIN (sees audit log) |
| `md@clinic.test` | MD (can prescribe, sign) |
| `rn@clinic.test` | RN (records visits, signs nursing notes) |
| `sw@clinic.test` | SW (psychosocial notes) |

## Voice → SOAP Flow

1. Nurse opens patient chart → clicks **Start Recording**
2. Speaks freely (e.g., *"Saw Mrs Whitfield today, pain 7/10 in hip, increased morphine to 15mg q4h, family coping, PPS around 30…"*)
3. **Stop & Process** → Whisper transcribes (~3s) → GPT-4o structures (~3s)
4. Editable SOAP draft appears with extracted ESAS scores, PPS, med changes, ICD-10 codes
5. Nurse reviews and **Signs & Saves** → ESAS/PPS rows persisted, audit log updated

## PHIPA-Aware Design

This is **PHIPA-aware**, not PHIPA-compliant. Compliance is a legal status requiring a Privacy Impact Assessment, Threat Risk Assessment, designated Privacy Officer, signed agreements, and ongoing controls. The architecture below is built for those reviews to go smoothly:

- TLS everywhere (Vercel/Neon defaults)
- Encryption at rest (Neon Postgres default)
- Canadian data residency (Neon ca-central-1)
- Immutable append-only audit log on every PHI read/write
- Per-user RBAC (`src/lib/rbac.ts`)
- 15-min idle session timeout
- PHI redacted from application logs (Pino redact paths in `src/lib/logger.ts`)
- Break-glass access mechanism (planned: requires reason, audited)
- Lockbox flag per patient (restricts which staff can read)
- Patient consent flag on record
- No PHI sent to third-party analytics

## Project Structure

```
src/
  app/
    (app)/                  ← authenticated layout
      patients/
        page.tsx            ← patient list w/ search
        [id]/page.tsx       ← chart + voice recorder + charts
      audit/page.tsx        ← admin-only audit viewer
    api/
      auth/[...nextauth]/   ← NextAuth handler
      transcribe/           ← Whisper endpoint
      soap/                 ← GPT-4o structuring
      notes/                ← persist note + extracted ESAS/PPS
    login/page.tsx
  auth.ts                   ← NextAuth config + RBAC types
  middleware.ts             ← route protection
  components/
    voice-note-recorder.tsx ← mic capture + UI
    esas-chart.tsx
    pps-chart.tsx
  lib/
    prisma.ts
    audit.ts                ← audit logger
    rbac.ts                 ← role → permission map
    logger.ts               ← Pino w/ PHI redaction
    utils.ts
prisma/
  schema.prisma             ← 10 models, 6 enums
  seed.ts                   ← 5 fictional patients + scores + meds
```

## Roadmap

- [ ] Patient admit form (`/patients/new`)
- [ ] Visit scheduling
- [ ] CMS 485 Plan of Care form
- [ ] IDG meeting note w/ speaker diarization
- [ ] Drug interaction check (OpenFDA + custom hospice rules)
- [ ] Offline PWA + sync (home visits w/ no signal)
- [ ] HL7/FHIR endpoint (talk to hospitals)
- [ ] e-Fax inbound (Twilio/Phaxio)
- [ ] PDF chart export for handoffs/audits
- [ ] 2FA (TOTP) on all accounts
- [ ] Break-glass UI w/ mandatory reason
- [ ] Bereavement tracking (13-month post-death)

## License

MIT — see [LICENSE](./LICENSE)

## Disclaimer

This software is **not a certified medical device** and has **not undergone clinical validation**. Do not use for real patient care without a Privacy Impact Assessment, legal review, and clinical sign-off. Demo data only.
