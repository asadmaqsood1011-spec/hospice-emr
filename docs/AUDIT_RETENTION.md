# Audit Retention Policy

Default retention is **7 years** (`AUDIT_RETENTION_DAYS=2555`) for PHIPA-aware operational audit logs.

Audit rows are append-only during normal app use. Retention is a controlled maintenance task:

1. Run encrypted database backup.
2. Run audit archive dry run.
3. Verify archive file exists and row count is expected.
4. Store archive off-host with the same access controls as backups.
5. Re-run with `--prune` only after backup and archive verification.

```bash
npm run audit:archive
npm run audit:archive -- --prune
```

Output is written to `audit-archives/*.jsonl`. Treat it as PHI.
