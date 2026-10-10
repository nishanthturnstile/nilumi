import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdtemp,
  open,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  CAPS,
  initializeLedger,
  reserve,
  spent,
  withLedger,
} from "../lib/verification/ledger.ts";

const child = (code, args) =>
  promisify(execFile)(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", code, ...args],
    { cwd: process.cwd(), timeout: 10000 },
  );

// Instrument real FileHandle operations, rather than replacing the ledger save.
const instrumentation = `
  import { open, readFile, writeFile } from 'node:fs/promises';
  import { join } from 'node:path';
  import { withLedger, reserve } from './lib/verification/ledger.ts';
  const directory = process.argv[1];
  const probe = await open(join(directory, 'probe'), 'wx');
  const prototype = Object.getPrototypeOf(probe);
  await probe.close();
  const contents = new WeakMap(), events = [];
  const originalWrite = prototype.writeFile, originalSync = prototype.sync;
  prototype.writeFile = async function(data, ...args) {
    const value = JSON.parse(String(data));
    contents.set(this, 'pid' in value ? 'lock' : 'ledger');
    if ('pid' in value && process.argv[2] === 'lock-write')
      throw new Error('injected_lock_write_failure');
    return originalWrite.call(this, data, ...args);
  };
  prototype.sync = async function() {
    const kind = (await this.stat()).isDirectory() ? 'directory' : contents.get(this);
    events.push(kind);
    if (kind === process.argv[2]) throw new Error('injected_' + kind + '_sync_failure');
    await originalSync.call(this);
  };
`;

test("S4 skips diagnostic lock flushing but commits file and directory before dispatch; canary keeps all three flushes", async () => {
  for (const scope of ["s4", "vgw"]) {
    const directory = await mkdtemp(join(tmpdir(), "nilumi-ledger-order-"));
    try {
      await initializeLedger(directory, scope);
      const { stdout } = await child(
        `${instrumentation}
        const scope = process.argv[3], trace = {stages:{}, saveCount:0, saves:[]};
        await withLedger(directory, scope, async (ledger, save) => {
          reserve(ledger, 'one', 100);
          await save();
        }, trace);
        events.push('dispatch');
        console.log(JSON.stringify({events, trace}));
      `,
        [directory, "none", scope],
      );
      const { events, trace } = JSON.parse(stdout);
      assert.deepEqual(
        events,
        scope === "s4"
          ? ["ledger", "directory", "dispatch"]
          : ["lock", "ledger", "directory", "dispatch"],
      );
      assert.equal(
        trace.lockDurability,
        scope === "s4" ? "diagnostic-only" : "flushed",
      );
      assert.equal("lockSyncMs" in trace.stages, scope === "vgw");
    } finally {
      await rm(directory, { recursive: true });
    }
  }
});

for (const failingSync of ["lock-write", "ledger", "directory"])
  test(`reservation ${failingSync} failure blocks the actual speech path without a provider call`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "nilumi-ledger-failure-"));
    try {
      await initializeLedger(directory, "s4");
      const { stdout } = await child(
        `${instrumentation}
        import { handleVoice, handleClip } from './lib/voice/service.ts';
        const env = {S4_ENABLED:'true', S4_STATE_DIR:directory,
          S4_ORIGIN:'https://example.invalid', AUTH_SECRET:'synthetic-test',
          S4_EVALUATOR_EMAILS:'test@example.invalid',
          S4_PRICE_VERIFIED_AT:'2026-10-09', S4_BILLING_MAX_MULTIPLIER:'1.2',
          SARVAM_API_KEY:'synthetic-test'};
        // Prepare before injecting the failure: descriptor persistence is independent.
        const instrumentedSync = prototype.sync;
        const instrumentedWrite = prototype.writeFile;
        prototype.sync = originalSync;
        prototype.writeFile = originalWrite;
        const prepared = await handleVoice(new Request(env.S4_ORIGIN + '/api/voice', {
          method:'POST', headers:{origin:env.S4_ORIGIN, 'content-type':'application/json'},
          body:JSON.stringify({mode:'listen', fixture:'short', voice:'ritu'})
        }), 'test@example.invalid', env);
        if (prepared.status !== 200) throw new Error('prepare_failed');
        const item = await prepared.json();
        events.length = 0;
        prototype.sync = instrumentedSync;
        prototype.writeFile = instrumentedWrite;
        let calls = 0;
        const provider = async function*() {calls++; yield new Uint8Array([1,0]);};
        const response = await handleClip(new Request(env.S4_ORIGIN + item.url),
          item.id, 'test@example.invalid', env, provider);
        prototype.sync = originalSync;
        prototype.writeFile = originalWrite;
        // A directory-sync failure may expose a committed reservation; it must
        // stay uncertain and must not dispatch when the fault is removed.
        const replay = process.argv[2] === 'directory' ?
          await handleClip(new Request(env.S4_ORIGIN + item.url),
            item.id, 'test@example.invalid', env, provider) : null;
        console.log(JSON.stringify({status:response.status, replayStatus:replay?.status,
          calls, events}));
      `,
        [directory, failingSync],
      );
      const result = JSON.parse(stdout);
      assert.equal(result.calls, 0);
      assert.equal(result.status, 503);
      if (failingSync === "directory") assert.equal(result.replayStatus, 503);
      if (failingSync !== "lock-write")
        assert.ok(result.events.includes(failingSync));
      const disk = JSON.parse(
        await readFile(join(directory, "s4-budget.json"), "utf8"),
      );
      assert.equal(disk.entries.length, failingSync === "directory" ? 1 : 0);
      // A failed directory flush may already expose the reservation. Keep it.
    } finally {
      await rm(directory, { recursive: true });
    }
  });

test("a separate writer cannot enter while the exclusive lock exists, even with empty diagnostic contents", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nilumi-ledger-process-"));
  const lockPath = join(directory, "s4-budget.lock");
  let lock;
  try {
    await initializeLedger(directory, "s4");
    lock = await open(lockPath, "wx");
    const { stdout } = await child(
      `import { withLedger } from './lib/verification/ledger.ts';
       let entered = false, code;
       try {await withLedger(process.argv[1], 's4', async () => {entered = true;});}
       catch(error) {code = error.code;}
       console.log(JSON.stringify({entered, code}));`,
      [directory],
    );
    assert.deepEqual(JSON.parse(stdout), {
      entered: false,
      code: "ledger_unavailable_or_busy",
    });
  } finally {
    await lock?.close();
    await rm(directory, { recursive: true });
  }
});

for (const phase of ["before-save", "after-save", "after-dispatch"])
  test(`process termination ${phase} preserves exclusivity and any committed reservation`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "nilumi-ledger-crash-"));
    try {
      await initializeLedger(directory, "s4");
      await assert.rejects(
        child(
          `import { withLedger, reserve, CAPS } from './lib/verification/ledger.ts';
           import { writeFile } from 'node:fs/promises';
           import { join } from 'node:path';
           const directory = process.argv[1], phase = process.argv[2];
           await withLedger(directory, 's4', async (ledger, save) => {
             reserve(ledger, 'crashed', CAPS.s4);
             if (phase === 'before-save') process.kill(process.pid, 'SIGKILL');
             await save();
             if (phase === 'after-save') process.kill(process.pid, 'SIGKILL');
           });
           // Fake provider dispatch; no real API or credits.
           await writeFile(join(directory, 'dispatched'), 'yes');
           process.kill(process.pid, 'SIGKILL');`,
          [directory, phase],
        ),
        (error) => error.signal === "SIGKILL",
      );
      const disk = JSON.parse(
        await readFile(join(directory, "s4-budget.json"), "utf8"),
      );
      assert.equal(spent(disk), phase === "before-save" ? 0 : CAPS.s4);
      if (phase !== "after-dispatch") {
        await assert.rejects(
          withLedger(directory, "s4", async () => {}),
          /ledger_unavailable_or_busy/,
        );
        // Only this isolated test's killed process owned the lock. Model the
        // existing operator recovery; production never automatically reclaims it.
        await unlink(join(directory, "s4-budget.lock"));
        await assert.rejects(readFile(join(directory, "dispatched")));
      } else {
        assert.equal(
          await readFile(join(directory, "dispatched"), "utf8"),
          "yes",
        );
      }
      await withLedger(directory, "s4", async (ledger) => {
        if (phase !== "before-save") {
          assert.throws(() => reserve(ledger, "crashed", 1), /replayed/);
          assert.throws(() => reserve(ledger, "another", 1), /hard_cap/);
        } else assert.equal(spent(ledger), 0);
      });
    } finally {
      await rm(directory, { recursive: true });
    }
  });

test("missing or invalid S4 ledgers never reach the callback and are not initialized implicitly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nilumi-ledger-invalid-"));
  try {
    for (const contents of [null, "broken", '{"version":1}']) {
      if (contents !== null)
        await writeFile(join(directory, "s4-budget.json"), contents);
      let entered = false;
      await assert.rejects(
        withLedger(directory, "s4", async () => {
          entered = true;
        }),
        /ledger_missing_or_invalid/,
      );
      assert.equal(entered, false);
    }
  } finally {
    await rm(directory, { recursive: true });
  }
});
