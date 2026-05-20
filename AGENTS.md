<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Product Direction

Build toward a full US hospice EMR incumbent replacement, not a demo app or voice-note add-on.

When adding features:
- Prefer complete hospice workflows over generic CRUD.
- Preserve HIPAA-ready posture: auth, RBAC, audit logging, PHI-safe storage, no public PHI URLs.
- Treat real-PHI readiness blockers as higher priority than cosmetic work.
- Do not claim HIPAA compliance; say HIPAA-ready until BAAs, risk analysis, policies, and operational controls are complete.
- Keep the US hospice target unless the user explicitly changes jurisdiction.
