# Backup & Restore Procedure

Hospice EMR holds PHI (protected health information). Backups must be:

1. **Encrypted at rest** — AES-256-CBC w/ PBKDF2 key derivation.
2. **Tested** — run a restore drill at least quarterly.
3. **Stored off-host** — never on the same machine as the database.
4. **Access-controlled** — only the Privacy Officer + Admin role.

## Daily backup

```bash
export BACKUP_PASSPHRASE='<strong passphrase from password manager>'
./scripts/backup.sh ./backups
```

Output: `./backups/hospice-emr-YYYYMMDDTHHMMSSZ.sql.enc`

### Production schedule

- Daily at 02:00 ET
- 30-day retention
- Stored in: AWS S3 bucket `s3://hospice-emr-backups/` w/ object lock + cross-region replication to ca-central-1
- Notification: PagerDuty if no upload in 26h

## Restore (manual drill)

```bash
export BACKUP_PASSPHRASE='<passphrase>'
./scripts/restore.sh ./backups/hospice-emr-20260518T020000Z.sql.enc
```

Script asks you to type the DB host to confirm before destructive ops.

## Quarterly drill checklist

- [ ] Pick a backup ≥7 days old
- [ ] Spin up empty test database (separate from prod)
- [ ] Run restore script pointed at test DB
- [ ] Verify row counts match expected (`SELECT COUNT(*) FROM "Patient", "Note", "AuditLog"`)
- [ ] Smoke test: log in as seeded admin, view a patient, view audit log
- [ ] Document drill date + result in `docs/drills.md`
- [ ] Destroy test DB

## Breach response

If a backup is suspected compromised:
1. Rotate `BACKUP_PASSPHRASE` immediately
2. Re-encrypt all retained backups with new passphrase
3. File breach notification per PHIPA s.12 (Information & Privacy Commissioner of Ontario)
4. Notify affected patients per s.12(2)
