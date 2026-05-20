# Incumbent Killer Strategy

Goal: build a full US hospice EMR replacement, not only an AI note-taking add-on.

## Positioning

The wedge is field-nurse documentation: voice -> structured SOAP, ESAS/PPS extraction, private photos, medication changes, and fast sign-off.

The end state is broader: replace legacy hospice EMRs by owning the complete clinical, operational, compliance, billing, and family-care loop.

## Non-Negotiable Direction

- Build workflow surfaces, not generic CRUD tables.
- Each new module must produce operational value inside the chart, not sit as an isolated admin page.
- Audit every PHI read/write and every high-risk workflow decision.
- Prefer domain commands like `completeMedicationReconciliation`, `signIdgNote`, `createPlanOfCare`, and `acknowledgeHandoff`.
- Keep AI as acceleration and review support, never autonomous clinical authority.
- HIPAA-ready means architecture plus vendor BAAs, risk analysis, policies, access control, and incident response.

## Competitive Gap To Close

Legacy platforms win today on breadth:

- Billing and Medicare reporting
- IDG meetings and signed minutes
- Plan of care / CMS 485 workflows
- Medication reconciliation and eRx/pharmacy coordination
- Referral/intake operations
- Bereavement tracking
- DME/pharmacy/fax/document integrations
- Implementation, support, and trust

This app wins only if it keeps its speed/UX/AI advantage while closing those breadth gaps.

## Build Sequence

### Slice 1: Medication Reconciliation

Purpose: make admit/transfer/discharge/high-risk med review safer and auditable.

Minimum workflow:

- Start med-rec from patient chart.
- Compare current active meds against proposed changes.
- Mark each med as continue, change, discontinue, or needs review.
- Capture reviewer, source, reason, and timestamp.
- Audit completion.

### Slice 2: CMS 485 / Plan Of Care

Purpose: make hospice eligibility and plan-of-care documentation first-class.

Minimum workflow:

- Create plan of care from patient chart.
- Capture diagnosis, prognosis, goals, interventions, disciplines, frequency, and certification window.
- Require MD signature state.
- Export printable summary.

### Slice 3: IDG Meeting Note

Purpose: support weekly interdisciplinary review.

Minimum workflow:

- Meeting agenda by patient.
- Discipline updates: RN, MD, SW, chaplain, aide.
- Action items with owner/due date.
- Signed minutes.
- Audit completion.

### Slice 4: Referral / Intake Pipeline

Purpose: handle admission conversion and missing documentation.

Minimum workflow:

- Referral source, diagnosis, eligibility signals, payer, family contacts.
- Missing items checklist.
- Convert ready referral to patient admission.
- Audit all changes.

### Slice 5: Billing / Medicare Ops

Purpose: close the largest incumbent advantage.

Minimum workflow:

- Visit completion reports.
- Level-of-care days.
- Unbilled/missing-signature worklist.
- Exportable billing packet.

## Current Highest Priority

Start with medication reconciliation. It is smaller than billing, directly clinical, and touches the patient chart where the app already has meds, notes, audit, roles, and patient access guards.

