# Audit Retention Policy

Default retention is **7 years** (`AUDIT_RETENTION_DAYS=2555`) for PHIPA-aware operational audit logs.

Audit rows are append-only during app use. Retention archive is export-only. It does not prune or mutate production audit rows.

Before real PHI, run `scripts/audit-immutability.sql` against production Postgres to block `UPDATE`, `DELETE`, and `TRUNCATE` on `"AuditLog"` at the database layer.

1. Run encrypted database backup.
2. Run audit archive.
3. Verify archive file exists and row count is expected.
4. Store archive off-host with the same access controls as backups.
5. Keep source DB rows intact for legal defensibility.

```bash
npm run audit:archive
```

Output is written to `audit-archives/*.jsonl`. Treat it as PHI.
