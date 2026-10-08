# S5 recovery runbook — template for the shared OneDrive document

**Status: shared document created; recovery not rehearsed.** The user confirmed
both adults have copied the runbook and opened the shared OneDrive document using
their own accounts. This is operator-reported access, not an automated inspection.
The repo contains instructions only; never add credentials or the private age key.
The user generated one real master key and confirmed private storage. Both
adults use this same master identity; separate keys are not required. 2FA
confirmation, successful decryption and each adult's recovery remain pending.

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

- Both adults independently accessed the recovery document: user confirmed.
- Real master-key storage: user confirmed; one shared identity for both adults.
- Both accounts' 2FA: pending confirmation.
- Real master-key decryption: user confirmed; automated scratch restore passed.
- Real master-key encryption and R2 upload/hash verification: passed October 8, 2026.
- Encrypted recovery download and content-free journal hash verification: passed.
- Restore to separate scratch with roles/extensions/RLS intact: passed October 8, 2026.
- Post-backup forget canary absent before traffic: passed; newer journal replayed.
- Both operators completed recovery within target: pending.
- Railway volume snapshot restore: passed October 8, 2026.
- Railway PostgreSQL 18 PITR to a separate service: passed October 8, 2026.
- Fresh-cluster role recreation and restricted-access restore: passed locally;
  real-key offsite scratch restore also passed.

The automated local test uses a synthetic database dump and verifies policy and
forget replay. It does not validate OneDrive availability, the real key, R2
access, production roles or either adult's ability to recover the system.

Current synthetic backup manifest:
`s5-synthetic/recovery-drill/backups/24b96953-3802-4de1-817e-d88489519d38.manifest.json`
in private bucket `nilumi-backups`. Object credentials are configured privately;
the test token expires October 15, 2026. The private master identity is not in
that configuration. Retention was a dry run with no eligible pairs or deletions.
Recheck the latest forget journals before actual recovery/cutover.

The user privately decrypted this backup successfully. The fresh scratch restore
matched all five manifest table counts, recreated restricted cluster roles,
verified extensions/ICU locale, FORCE RLS and both-household visibility, and
replayed the latest remote journals before restricted app queries. A second run
recovered the same backup after a new `private2` forget was published, proving
that later deletion survived recovery. Plaintext and scratch resources were
removed afterwards. The backup was about 27 minutes old; the automated restore
took about 1.6 seconds. These are synthetic drill measurements, not acceptance
of production RPO/RTO or either adult's independent full recovery.

Graphile queue runtime was reinstalled; this schema-only offsite archive does not
restore queue contents. Production queue reconstruction remains a separate task.

## Guided OneDrive and key setup

The shared document access and real-key generation/storage steps are complete by
user confirmation. The agent has not accessed the private identity. The public
recipient is `age1xpktwyl7yfswh3mah3zqctalgwgsvqsyhlzattk5aukj2aks9qdqv962ce`.
Retain the following instructions for reference; do not generate a second key.

1. Create a private OneDrive folder and recovery document. Share it with the
   other adult's specific Microsoft account; allow both adults to maintain it.
   Confirm 2FA and have the other adult open it while signed into their own account.
2. Install the official age tool. On Windows, use
   `winget install --id FiloSottile.age`; in Ubuntu, use `sudo apt install age`.
3. Create a private temporary folder outside the repository and shared terminal
   workspace. Generate the real key there with
   `age-keygen -o recovery.agekey`. The command writes the private identity to
   that file and prints its public `age1…` recipient.
4. Privately copy the complete identity file into the shared recovery document,
   preserving its text exactly. Never paste it into this chat or a coding-agent
   terminal, upload it to GitHub, or configure it on Railway. Have both adults
   confirm they can access the stored identity independently.
5. Record the public recipient separately. Only this public `age1…` value may
   be supplied here and configured for the backup worker. Confirm the stored
   identity can decrypt a small synthetic trial before removing the temporary
   local identity copy. Keep the master identity in the recovery document.
6. Record private R2 bucket `nilumi-backups`, account endpoint
   `https://68876249314ab88c8b5bdb86ba5fd8c8.r2.cloudflarestorage.com`, and test
   prefix `s5-synthetic/recovery-drill/`. Supply scoped R2 credentials through
   private setup when we are ready to run the drill; the endpoint alone does not
   prove authenticated access.

After setup, run the synthetic encrypted upload/download, then follow the restore
procedure with each adult as operator. Record RPO/RTO; successful automated
upload alone does not complete the human recovery gate.

Official installation reference: [age](https://github.com/FiloSottile/age#installation).

### Windows setup progress and operator commands

age 1.3.2 was installed with winget on October 8, 2026; installer hash verification
passed. The user subsequently generated the identity privately. Open a new personal PowerShell window
after installation so the updated PATH is available. After creating the shared
document, run these commands yourself, outside the coding-agent terminal:

```powershell
$recoveryDir = Join-Path $env:LOCALAPPDATA 'NilumiRecovery'
New-Item -ItemType Directory -Path $recoveryDir -Force | Out-Null
age-keygen -o (Join-Path $recoveryDir 'recovery.agekey')
```

If an identity file already exists, stop and reuse the intended master identity;
do not create a replacement without updating and verifying the recovery plan.
Keep the complete identity file private. Copy its contents into the OneDrive
recovery document yourself, then verify access from the second adult's account.
Only return the printed public recipient and the access confirmation here.

OneDrive setup: create folder **Nilumi Recovery**, create document **Nilumi
Recovery Runbook**, copy this template, then use **Share → Specific people** with
the other adult's account and edit access. Verify the document itself is accessible.
Reference: [Microsoft OneDrive sharing instructions](https://support.microsoft.com/en-us/onedrive/share-files-and-folders-in-microsoft-onedrive).

## Device and home-network evidence still needed

Use synthetic data only. For each adult's installed PWA, record device/browser,
network and time; verify foreground stream updates, background/foreground resume,
offline/reconnect replay and no duplicate event IDs. Measure home-network RTT
separately. The existing endpoint checks prove Railway transport only; this spike
does not implement the production PWA or its reminder provider. Keep these gates
pending until the installed application path can be exercised.
