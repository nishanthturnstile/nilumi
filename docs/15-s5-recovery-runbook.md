# S5 recovery runbook — template for the shared OneDrive document

**Status: prepared, not rehearsed.** Copy this into a OneDrive folder shared with
the other adult. The repo contains instructions only; never add credentials or
the private age key. The user confirmed the shared document is not created yet.

## Complete privately before the first drill

- Confirm both Microsoft accounts use 2FA and both adults can open the document
  from their own accounts and devices.
- Record account/sign-in paths for Railway, Cloudflare/R2, GitHub, Resend and the
  domain registrar; project/environment/service IDs; where credentials live;
  who to contact and how to revoke a lost phone's sessions.
- Generate the real age master key on a trusted device with `age-keygen`. Store
  the private key only in this shared recovery document. Record its public
  recipient separately for the worker. No rotating drill key substitutes for it.
- Record the R2 bucket/prefix, backup schedule, object retention and latest
  verified backup manifest location. Use scoped object credentials.
- Fill in the measured server version, extensions/locale, app revision and role
  migration paths. Record the Postgres dump/restore CLI versions.

## Restore procedure

1. Record incident time, operator and the target backup timestamp. Stop app and
   worker traffic; fence queued deliveries. Do not restore over a live database.
2. From a trusted recovery device, sign in to R2, fetch the selected encrypted
   backup and its manifest, and verify the ciphertext SHA-256. Fetch all relevant
   content-free forget-journal objects newer than the backup watermark.
3. Provision a separate scratch database on an approved compatible PostgreSQL
   server. Apply/verify cluster roles using the recorded role migration; database
   dumps do not replace role/credential recovery. Use fresh private credentials.
4. Decrypt locally with the real OneDrive master key. Keep plaintext on private
   temporary storage only, with restrictive permissions. Example command:

   ```sh
   age --decrypt -i /private/recovery.agekey -o /private/scratch/backup.pg backup.pg.age
   ```

5. Restore with the matching `pg_restore --exit-on-error` into scratch. Check
   migration version, extensions/locale, row counts, every visibility-class
   canary, FORCE RLS and the restricted app/worker privileges.
6. Replay forget tombstones through the restored system's redaction executor,
   including derived content references. Validate that the forgotten canary and
   all derived copies are absent. Recheck the journal watermark for any later
   deletion before allowing traffic. Never run a raw replay across households.
7. Exercise restricted-log-in queries for both adults and a second household;
   private records and existence hints must remain inaccessible. Confirm no
   stale reminder revision can dispatch and delivered effects deduplicate.
8. Point a disabled test app/worker at the restored database and run readiness,
   read-only smoke and queue checks. Enable runtime traffic only after the
   migration/role/forget/visibility checks pass and the operator approves cutover.
9. Remove plaintext dump/key files from temporary recovery storage; retain the
   encrypted source and content-free incident evidence. Do not delete the real
   master key from the shared document.
10. Record recovered backup time, observed data loss, total recovery time,
    failures and operator. Targets: RPO ≤24 hours and RTO ≤2 hours. Repeat with
    the other adult as operator to verify the human path.

## Drill acceptance record

Fill in dates and outcomes privately; publish only non-secret evidence in S5:

- Both adults independently accessed the recovery document: pending.
- Real master-key encryption and R2 upload/hash verification: pending.
- Restore to separate scratch with roles/extensions/RLS intact: pending live drill.
- Post-backup forget canary absent before traffic: pending live drill.
- Both operators completed recovery within target: pending.
- Railway volume snapshot restore: pending; PITR support/restore: unverified.

The automated local test uses a synthetic database dump and verifies policy and
forget replay. It does not validate OneDrive availability, the real key, R2
access, production roles or either adult's ability to recover the system.
