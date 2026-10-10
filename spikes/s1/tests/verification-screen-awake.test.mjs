import assert from "node:assert/strict";
import test from "node:test";
import { ScreenAwake } from "../lib/voice/screen-awake.ts";

const tick = () => new Promise((resolve) => setImmediate(resolve));
function sentinel() {
  const events = new EventTarget();
  return {
    released: false,
    releases: 0,
    addEventListener: events.addEventListener.bind(events),
    async release() {
      this.released = true;
      this.releases++;
      events.dispatchEvent(new Event("release"));
    },
  };
}

test("visible test page holds one lock and releases on toggle-off", async () => {
  const lock = sentinel();
  const states = [];
  let requests = 0;
  const awake = new ScreenAwake(
    async () => {
      requests++;
      return lock;
    },
    () => true,
    (state) => states.push(state),
  );
  awake.enable();
  awake.enable();
  await tick();
  awake.enable();
  assert.equal(requests, 1);
  assert.equal(states.at(-1), "active");
  awake.disable();
  assert.equal(lock.releases, 1);
  assert.equal(states.at(-1), "off");
});

test("hidden page releases lock and visible return reacquires", async () => {
  const locks = [sentinel(), sentinel()];
  let visible = true;
  let requests = 0;
  const states = [];
  const awake = new ScreenAwake(
    async () => locks[requests++],
    () => visible,
    (state) => states.push(state),
  );
  awake.enable();
  await tick();
  visible = false;
  awake.visibilityChanged();
  assert.equal(locks[0].released, true);
  assert.equal(states.at(-1), "released");
  visible = true;
  awake.visibilityChanged();
  await tick();
  assert.equal(requests, 2);
  assert.equal(states.at(-1), "active");
  awake.disable();
});

test("late grant after disposal is released without becoming active", async () => {
  const lock = sentinel();
  let grant;
  const states = [];
  const awake = new ScreenAwake(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
    () => true,
    (state) => states.push(state),
  );
  awake.enable();
  awake.disable();
  grant(lock);
  await tick();
  assert.equal(lock.released, true);
  assert.equal(states.includes("active"), false);
  assert.equal(states.at(-1), "off");
});

test("visibility race releases old grant without replacing new lock", async () => {
  let visible = true;
  const grants = [];
  const locks = [sentinel(), sentinel()];
  const states = [];
  const awake = new ScreenAwake(
    () => new Promise((resolve) => grants.push(resolve)),
    () => visible,
    (state) => states.push(state),
  );
  awake.enable();
  visible = false;
  awake.visibilityChanged();
  visible = true;
  awake.visibilityChanged();
  grants[1](locks[1]);
  await tick();
  grants[0](locks[0]);
  await tick();
  assert.equal(locks[0].released, true);
  assert.equal(locks[1].released, false);
  assert.equal(states.at(-1), "active");
  awake.disable();
  assert.equal(locks[1].released, true);
});

test("OS release is reported without a retry loop; explicit retry recovers", async () => {
  const locks = [sentinel(), sentinel()];
  let requests = 0;
  const states = [];
  const awake = new ScreenAwake(
    async () => locks[requests++],
    () => true,
    (state) => states.push(state),
  );
  awake.enable();
  await tick();
  await locks[0].release();
  await tick();
  assert.equal(states.at(-1), "released");
  assert.equal(requests, 1);
  awake.enable();
  await tick();
  assert.equal(requests, 2);
  assert.equal(states.at(-1), "active");
  awake.disable();
});

test("unsupported and denied locks preserve a usable explicit state", async () => {
  const states = [];
  const unsupported = new ScreenAwake(
    undefined,
    () => true,
    (state) => states.push(state),
  );
  unsupported.enable();
  assert.equal(states.at(-1), "unsupported");
  unsupported.disable();
  const denied = new ScreenAwake(
    async () => {
      throw new Error("denied");
    },
    () => true,
    (state) => states.push(state),
  );
  denied.enable();
  await tick();
  assert.equal(states.at(-1), "unavailable");
  denied.disable();
  assert.equal(states.at(-1), "off");
});
