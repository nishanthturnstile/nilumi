import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionToken,
  needsStepUp,
  readSessionToken,
} from "../lib/auth.ts";

function secretFixture(run) {
  const before = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "synthetic-session-test-key";
  return Promise.resolve()
    .then(run)
    .finally(() => {
      if (before === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = before;
    });
}

test("90-day signed session survives module restart with stable deployment key", () =>
  secretFixture(async () => {
    const now = Date.now();
    const token = createSessionToken("owner@example.invalid", now);
    const restarted = await import(`../lib/auth.ts?restart=${now}`);
    const session = restarted.readSessionToken(token);
    assert.equal(session?.email, "owner@example.invalid");
    assert.equal(session?.exp, now + 90 * 86400000);
    assert.equal(session?.authAt, now);
  }));

test("expired, tampered and changed-key sessions remain rejected", () =>
  secretFixture(() => {
    const token = createSessionToken("owner@example.invalid");
    assert.equal(readSessionToken(undefined), null);
    assert.equal(readSessionToken(`${token}tampered`), null);
    assert.equal(
      readSessionToken(
        createSessionToken("owner@example.invalid", Date.now() - 91 * 86400000),
      ),
      null,
    );
    process.env.AUTH_SECRET = "different-synthetic-deployment-key";
    assert.equal(readSessionToken(token), null);
  }));

test("persistent login does not remove the sensitive-view step-up window", () =>
  secretFixture(() => {
    const now = Date.now();
    const session = readSessionToken(
      createSessionToken("owner@example.invalid", now - 11 * 60000),
    );
    assert.ok(session);
    assert.equal(needsStepUp(session.authAt), true);
    assert.equal(needsStepUp(now), false);
  }));
