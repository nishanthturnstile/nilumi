import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { encryptDump, journalSnapshot } from "../scripts/backup.mjs";
import { databaseUrl } from "../src/db.mjs";
import { createSmokeServer, resumeCursor } from "../src/server.mjs";

test("database target is disposable and remote use is opt-in", () => {
  assert.throws(() =>
    databaseUrl({ S5_DATABASE_URL: "postgres://localhost/production" }),
  );
  assert.throws(() =>
    databaseUrl({ S5_DATABASE_URL: "postgres://remote.invalid/s5_smoke" }),
  );
  assert.ok(databaseUrl({}).endsWith("/s5_smoke"));
});
test("journal watermark blocks backup and public recipient is mandatory", async () => {
  await assert.rejects(
    journalSnapshot({ query: async () => ({ rowCount: 1 }) }),
    /unjournaled/,
  );
  await assert.rejects(
    encryptDump(Buffer.from("synthetic"), ""),
    /public_age_recipient/,
  );
});
test("resume cursor rejects injection, out-of-range and malformed IDs", () => {
  assert.equal(resumeCursor("3"), 3);
  for (const value of ["-1", "11", "1\n\ndata: injected", "NaN", "1.5"])
    assert.throws(() => resumeCursor(value));
});
test("stream rejects unauthenticated callers and resumes synthetic IDs", async () => {
  const token = "a".repeat(64);
  const server = createSmokeServer({ query: async () => {} }, token);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(
      (await fetch(`${origin}/stream`, { method: "POST" })).status,
      401,
    );
    const headers = { Authorization: `Bearer ${token}`, "Last-Event-ID": "8" };
    const response = await fetch(`${origin}/stream`, {
      method: "POST",
      headers,
    });
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.deepEqual(
      [...body.matchAll(/id: (\d+)/g)].map((m) => Number(m[1])),
      [9, 10],
    );
    assert.equal(
      (
        await fetch(`${origin}/stream`, {
          method: "POST",
          headers: { ...headers, "Last-Event-ID": "999" },
        })
      ).status,
      400,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
