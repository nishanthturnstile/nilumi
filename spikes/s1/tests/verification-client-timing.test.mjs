import assert from "node:assert/strict";
import test from "node:test";
import { LongTaskCapture, resourceTrace } from "../lib/voice/client-timing.ts";

const resource = {
  startTime: 1000,
  fetchStart: 1000,
  workerStart: 0,
  requestStart: 1000,
  responseStart: 1369,
  finalResponseHeadersStart: 1369,
  responseEnd: 2300,
  domainLookupStart: 1000,
  domainLookupEnd: 1000,
  connectStart: 1000,
  connectEnd: 1000,
  secureConnectionStart: 0,
  nextHopProtocol: "h3",
};

test("resource offsets distinguish dispatch delay from delayed fetch resumption", () => {
  const dispatchDelay = resourceTrace(
    {
      ...resource,
      requestStart: 1758,
      responseStart: 2127,
      finalResponseHeadersStart: 2127,
    },
    1000,
    0,
    1127,
  );
  const callbackDelay = resourceTrace(resource, 1000, 0, 1127);
  assert.equal(dispatchDelay.requestToHeadersMs, 369);
  assert.equal(callbackDelay.requestToHeadersMs, 369);
  assert.equal(dispatchDelay.beforeRequestMs, 758);
  assert.equal(dispatchDelay.afterHeadersMs, 0);
  assert.equal(callbackDelay.beforeRequestMs, 0);
  assert.equal(callbackDelay.afterHeadersMs, 758);
  assert.equal(callbackDelay.startMs, 0);
  assert.equal(callbackDelay.workerStartMs, null);
});

test("final-header timing avoids attributing interim response time to callbacks", () => {
  const trace = resourceTrace(
    { ...resource, responseStart: 1100, finalResponseHeadersStart: 1300 },
    1000,
    0,
    320,
  );
  assert.equal(trace.responseStartMs, 100);
  assert.equal(trace.finalResponseHeadersStartMs, 300);
  assert.equal(trace.afterHeadersMs, 20);
  assert.equal(trace.headersTimestampSource, "final-response");
});

test("missing resource timestamps remain unknown; valid zero offsets remain zero", () => {
  const entry = { ...resource, requestStart: 0, responseStart: 0 };
  delete entry.finalResponseHeadersStart;
  const trace = resourceTrace(entry, 1000, 0, 320);
  assert.equal(trace.startMs, 0);
  assert.equal(trace.fetchStartMs, 0);
  assert.equal(trace.requestStartMs, null);
  assert.equal(trace.responseStartMs, null);
  assert.equal(trace.requestToHeadersMs, null);
  assert.equal(trace.afterHeadersMs, null);
  assert.equal(trace.finalResponseHeadersSupported, false);
  assert.equal(trace.headersTimestampSource, null);
  assert.equal(
    resourceTrace({ ...resource, finalResponseHeadersStart: 0 }, 1000, 0, 400)
      .headersTimestampSource,
    "first-response",
  );
});

function observerFixture(run, behavior = {}) {
  const previous = globalThis.PerformanceObserver;
  class Observer {
    static instance;
    static supportedEntryTypes = behavior.supported ?? ["longtask"];
    disconnected = false;
    pending = [];
    constructor(callback) {
      this.callback = callback;
      Observer.instance = this;
    }
    observe(options) {
      assert.deepEqual(options, { type: "longtask" });
      if (behavior.observeThrows) throw new Error("not available");
    }
    takeRecords() {
      if (behavior.readThrows) throw new Error("cannot read");
      return this.pending;
    }
    disconnect() {
      this.disconnected = true;
    }
    deliver(entries) {
      this.callback({ getEntries: () => entries });
    }
  }
  globalThis.PerformanceObserver = Observer;
  try {
    run(() => Observer.instance);
  } finally {
    if (previous === undefined) delete globalThis.PerformanceObserver;
    else globalThis.PerformanceObserver = previous;
  }
}

test("unsupported long tasks are unknown, not a fabricated zero measurement", () => {
  observerFixture(
    (instance) => {
      const trace = new LongTaskCapture(1000).finish(20, 40);
      assert.equal(trace.status, "unsupported");
      assert.equal(trace.count, null);
      assert.equal(trace.overlapMs, null);
      assert.equal(instance(), undefined);
    },
    { supported: [] },
  );
});

for (const behavior of [{ observeThrows: true }, { readThrows: true }])
  test(`long-task observation failure cleans up without claiming no blocking: ${JSON.stringify(behavior)}`, () => {
    observerFixture((instance) => {
      const trace = new LongTaskCapture(1000).finish(20, 40);
      assert.equal(trace.status, "unavailable");
      assert.equal(trace.count, null);
      assert.equal(instance().disconnected, true);
    }, behavior);
  });

test("long tasks clip to onset, include pending records and omit names/attribution", () => {
  observerFixture((instance) => {
    const capture = new LongTaskCapture(5000);
    instance().deliver([
      { startTime: 4980, duration: 70, name: "private-url" },
    ]);
    instance().pending = [
      { startTime: 5070, duration: 100, attribution: "private-stack" },
      { startTime: 5200, duration: 50 },
    ];
    const trace = capture.finish(80, 120);
    assert.equal(trace.status, "recorded");
    assert.equal(trace.count, 2);
    assert.equal(trace.overlapMs, 100);
    assert.equal(trace.maxDurationMs, 100);
    assert.equal(trace.beforeFirstChunkMs, 60);
    assert.equal(trace.afterFirstChunkMs, 40);
    assert.equal(instance().disconnected, true);
    assert.doesNotMatch(JSON.stringify(trace), /private|attribution/);
  });
});

test("long-task capture has a fixed bound and marks incomplete observation", () => {
  observerFixture((instance) => {
    const capture = new LongTaskCapture(1000);
    instance().deliver(
      Array.from({ length: 200 }, (_, i) => ({
        startTime: 1000 + i * 50,
        duration: 50,
      })),
    );
    const trace = capture.finish(null, 10000);
    assert.equal(trace.count, 128);
    assert.equal(trace.overlapMs, 6400);
    assert.equal(trace.truncated, true);
    assert.equal(trace.beforeFirstChunkMs, null);
    assert.equal(trace.afterFirstChunkMs, null);
  });
});
