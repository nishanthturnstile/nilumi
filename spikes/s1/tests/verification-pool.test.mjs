import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  PROVIDER_POOL_POLICY,
  reserveTtsMicros,
  SENTENCES,
  SMOKE_IDS,
} from "../config/voice.ts";
import {
  initializeLedger,
  reserve,
  spent,
  withLedger,
} from "../lib/verification/ledger.ts";
import { pauseBetweenChecks } from "../lib/voice/pause.ts";
import { traceProviderRequest } from "../lib/voice/timing.ts";
import {
  createProviderPool,
  recordProviderPolicy,
  sarvamPool,
} from "../lib/voice/transport.ts";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}
test("dedicated pool retains a connection across real 3/6/12-second idle gaps and observes peer close", async () => {
  let requests = 0;
  const server = createServer(async (req, res) => {
    requests++;
    let body = "";
    for await (const part of req) body += part.toString();
    assert.equal(body, "synthetic text");
    res.setHeader("keep-alive", "timeout=30");
    res.end("synthetic audio bytes");
  });
  server.keepAliveTimeout = 30_000;
  const origin = await listen(server),
    pool = createProviderPool(origin),
    traces = [];
  const send = async () => {
    const trace = {};
    const response = await traceProviderRequest(
      trace,
      () =>
        fetch(`${origin}/stream`, {
          method: "POST",
          body: "synthetic text",
          dispatcher: pool,
        }),
      origin,
    );
    recordProviderPolicy(trace, response);
    await response.arrayBuffer();
    traces.push(trace);
    return trace;
  };
  try {
    const first = await send();
    assert.equal(first.connection.reused, false);
    for (const gap of [3_000, 6_000, 12_000]) {
      await sleep(gap);
      const next = await send();
      assert.equal(next.connection.socketId, first.connection.socketId);
      assert.equal(next.connection.reused, true);
      assert.ok(next.connection.idleBeforeMs >= gap - 100);
      assert.equal(next.poolPolicy.effectiveIdleMs, 15_000);
    }
    assert.equal(requests, 4);
    const disconnected = once(pool, "disconnect");
    server.closeIdleConnections();
    await disconnected;
    const afterClose = await send();
    assert.equal(afterClose.connection.reused, false);
    assert.notEqual(afterClose.connection.socketId, first.connection.socketId);
    assert.equal(afterClose.previousDisconnect.reason, "remote-close");
    assert.equal(requests, 5);
    assert.equal(sarvamPool(), sarvamPool());
  } finally {
    await pool.destroy();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
test("two pooled POST streams remain isolated; abort and partial failure never resend synthesis", async () => {
  let requests = 0,
    release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const server = createServer(async (req, res) => {
    requests++;
    let body = "";
    for await (const part of req) body += part.toString();
    assert.equal(body, "synthetic text");
    res.writeHead(200, { "content-type": "audio/wav" });
    res.write("prefix");
    if (req.url === "/failure") {
      await sleep(20);
      res.destroy();
    } else {
      await gate;
      res.end("suffix");
    }
  });
  const origin = await listen(server),
    pool = createProviderPool(origin);
  const stopped = new AbortController();
  const post = (path, signal) =>
    fetch(`${origin}${path}`, {
      method: "POST",
      body: "synthetic text",
      dispatcher: pool,
      signal,
    });
  try {
    const [a, b] = await Promise.all([post("/a", stopped.signal), post("/b")]);
    assert.equal(requests, 2);
    assert.ok(pool.stats.connected <= PROVIDER_POOL_POLICY.connections);
    const aBody = a.arrayBuffer(),
      bBody = b.text();
    stopped.abort();
    await assert.rejects(aBody);
    release();
    assert.equal(await bBody, "prefixsuffix");
    const failed = await post("/failure");
    await assert.rejects(failed.arrayBuffer());
    await sleep(30);
    assert.equal(requests, 3);
  } finally {
    release();
    await pool.destroy();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
test("provider idle policy respects server hints and explicit close", () => {
  for (const [headers, expected] of [
    [{}, 15_000],
    [{ "keep-alive": "timeout=8" }, 6_000],
    [{ "keep-alive": "timeout=30" }, 15_000],
    [{ connection: "close" }, 0],
  ]) {
    const trace = {};
    recordProviderPolicy(trace, new Response(null, { headers }));
    assert.equal(trace.poolPolicy.effectiveIdleMs, expected);
    assert.equal(trace.poolPolicy.connections, 2);
    assert.equal(trace.poolPolicy.allowH2, false);
  }
});
test("ledger substage timings preserve durable charging and lock cleanup after callback failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nilumi-s4-ledger-timing-"));
  const trace = { stages: {}, saveCount: 0, saves: [] };
  try {
    await initializeLedger(directory, "s4");
    await assert.rejects(
      withLedger(
        directory,
        "s4",
        async (ledger, save) => {
          reserve(ledger, "durable-before-failure", 234_000);
          await save();
          const durable = JSON.parse(
            await readFile(join(directory, "s4-budget.json"), "utf8"),
          );
          assert.equal(spent(durable), 234_000);
          throw new Error("failure after durable reservation");
        },
        trace,
      ),
      /failure after durable/,
    );
    assert.equal(trace.saveCount, 1);
    assert.equal(trace.lockDurability, "diagnostic-only");
    assert.equal(trace.stages.lockSyncMs, undefined);
    for (const key of [
      "lockAcquireMs",
      "lockWriteMs",
      "readMs",
      "parseValidateMs",
      "callbackMs",
      "lockCloseMs",
      "lockRemoveMs",
    ])
      assert.ok(
        Number.isFinite(trace.stages[key]) && trace.stages[key] >= 0,
        key,
      );
    for (const key of [
      "serializeMs",
      "openMs",
      "writeMs",
      "syncMs",
      "closeMs",
      "renameMs",
      "directoryOpenMs",
      "directorySyncMs",
      "directoryCloseMs",
    ])
      assert.ok(
        Number.isFinite(trace.saves[0][key]) && trace.saves[0][key] >= 0,
        key,
      );
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(spent(ledger), 234_000),
    );
    assert.ok(!JSON.stringify(trace).includes(directory));
    assert.ok(!JSON.stringify(trace).includes("durable-before-failure"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("Stop during the smoke pause prevents a second attempt; four checks fit the diagnostic allowance", async () => {
  const stop = new AbortController();
  let dispatched = 1;
  const next = pauseBetweenChecks(100, stop.signal).then(() => {
    dispatched++;
  });
  stop.abort();
  await assert.rejects(next);
  assert.equal(dispatched, 1);
  assert.throws(() => pauseBetweenChecks(100, stop.signal));
  const oneCheck = SMOKE_IDS.reduce(
    (sum, id) =>
      sum + reserveTtsMicros(SENTENCES.find((s) => s.id === id).text),
    0,
  );
  assert.equal(oneCheck, 234_000);
  assert.equal(oneCheck * 4, 936_000);
});
