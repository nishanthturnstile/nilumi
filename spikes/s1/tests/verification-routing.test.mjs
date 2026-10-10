import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import {
  controllerRoute,
  rootPushRegistration,
  startVoiceRouting,
  VOICE_WORKER_URL,
} from "../lib/voice/routing.ts";

const origin = "https://staging.nilumi.test";
const voice = { scriptURL: new URL(VOICE_WORKER_URL, origin).href };
const shell = { scriptURL: `${origin}/sw.js` };
const tick = () => new Promise((resolve) => setImmediate(resolve));

function container(register = async () => ({})) {
  const events = new EventTarget();
  return {
    controller: shell,
    register,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    changed() {
      events.dispatchEvent(new Event("controllerchange"));
    },
  };
}

test("voice worker has no fetch/cache/push handler and claims after activation", async () => {
  const source = await readFile(
    new URL("../public/voice-sw.js", import.meta.url),
    "utf8",
  );
  const listeners = new Map();
  let installed = 0,
    claimed = 0;
  vm.runInNewContext(source, {
    self: {
      addEventListener: (name, handler) => listeners.set(name, handler),
      skipWaiting: async () => installed++,
      clients: { claim: async () => claimed++ },
    },
  });
  assert.deepEqual([...listeners.keys()], ["install", "activate"]);
  assert.doesNotMatch(source, /respondWith|importScripts|caches\./);
  let pending;
  listeners.get("install")({
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
  listeners.get("activate")({
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
  assert.equal(installed, 1);
  assert.equal(claimed, 1);
});

test("routing classification requires the expected origin and worker revision", () => {
  assert.equal(controllerRoute(voice, origin), "voice-network");
  assert.equal(controllerRoute(shell, origin), "shell-fetch");
  assert.equal(controllerRoute(null, origin), "uncontrolled");
  assert.equal(
    controllerRoute({ scriptURL: "not-a-url" }, origin),
    "unavailable",
  );
  assert.equal(controllerRoute(voice, "https://other.test"), "other");
  assert.equal(
    controllerRoute(
      { scriptURL: `${origin}/voice-sw.js?revision=old` },
      origin,
    ),
    "other",
  );
});

test("registration does not report direct routing until the controller changes", async () => {
  const calls = [],
    states = [];
  const sw = container(async (...args) => {
    calls.push(args);
    return {};
  });
  const cleanup = startVoiceRouting(sw, origin, (state) => states.push(state));
  await tick();
  assert.deepEqual(calls, [
    [VOICE_WORKER_URL, { scope: "/voice", updateViaCache: "none" }],
  ]);
  assert.equal(states.at(-1), "pending");
  sw.controller = voice;
  sw.changed();
  assert.equal(states.at(-1), "ready");
  cleanup();
  const before = states.length;
  sw.controller = shell;
  sw.changed();
  assert.equal(states.length, before);
});

test("failed registration preserves the old controller without retrying", async () => {
  let calls = 0;
  const states = [];
  const sw = container(async () => {
    calls++;
    throw new Error("offline");
  });
  const cleanup = startVoiceRouting(sw, origin, (state) => states.push(state));
  await tick();
  assert.equal(states.at(-1), "unavailable");
  assert.equal(sw.controller, shell);
  assert.equal(calls, 1);
  cleanup();
});

test("a late registration completion cannot update a disposed page", async () => {
  let finish;
  const states = [];
  const sw = container(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const cleanup = startVoiceRouting(sw, origin, (state) => states.push(state));
  cleanup();
  finish({});
  await tick();
  assert.deepEqual(states, ["pending"]);
});

test("push reuses the root registration even when ready belongs to voice", async () => {
  const root = { scope: `${origin}/`, active: { state: "activated" } };
  const sw = container();
  sw.ready = Promise.resolve({ scope: `${origin}/voice` });
  sw.getRegistration = async (scope) => {
    assert.equal(scope, `${origin}/`);
    return root;
  };
  sw.register = async () => {
    throw new Error("must reuse existing root push subscription");
  };
  assert.equal(await rootPushRegistration(sw, origin), root);
});

test("first root installation waits for activation and cleans up its listener", async () => {
  const worker = new EventTarget();
  worker.state = "installing";
  const root = { scope: `${origin}/`, installing: worker };
  const calls = [];
  const sw = container(async (...args) => {
    calls.push(args);
    return root;
  });
  sw.getRegistration = async () => undefined;
  let settled = false;
  const pending = rootPushRegistration(sw, origin).then((value) => {
    settled = true;
    return value;
  });
  await tick();
  assert.equal(settled, false);
  worker.state = "activated";
  worker.dispatchEvent(new Event("statechange"));
  assert.equal(await pending, root);
  assert.deepEqual(calls, [["/sw.js", { scope: "/", updateViaCache: "none" }]]);
});

test("push cannot subscribe to a voice scope or a failed root installation", async () => {
  const wrong = container(async () => ({ scope: `${origin}/voice` }));
  wrong.getRegistration = async () => undefined;
  await assert.rejects(rootPushRegistration(wrong, origin), /scope mismatch/);
  const worker = new EventTarget();
  worker.state = "installing";
  const failed = container();
  failed.getRegistration = async () => ({
    scope: `${origin}/`,
    installing: worker,
  });
  const pending = rootPushRegistration(failed, origin);
  await tick();
  worker.state = "redundant";
  worker.dispatchEvent(new Event("statechange"));
  await assert.rejects(pending, /installation failed/);
});
