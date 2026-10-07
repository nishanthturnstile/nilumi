import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const compiled = mkdtempSync(join(tmpdir(), "nilumi-bakeoff-test-"));
execFileSync("pnpm", [
  "exec",
  "tsc",
  "lib/bakeoff.ts",
  "--module",
  "commonjs",
  "--target",
  "es2022",
  "--strict",
  "--esModuleInterop",
  "--skipLibCheck",
  "--outDir",
  compiled,
]);
after(() => rmSync(compiled, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
const { wer, entityAccuracy, p50, p95 } = require(join(compiled, "scoring.js"));
const { handleBakeoff } = require(join(compiled, "bakeoff.js"));
const { transcribeSarvam } = require(join(compiled, "stt/sarvam.js"));
const { transcribeElevenlabs } = require(join(compiled, "stt/elevenlabs.js"));
const { KEYTERMS } = require(join(compiled, "keyterms.js"));
const file = (name = "one.wav", contents = "fake audio", type = "audio/wav") =>
  new File([contents], name, { type });
const req = (form) =>
  new Request("https://example.invalid/api/bakeoff", {
    method: "POST",
    body: form,
  });
const batch = (files = [file()]) => {
  const f = new FormData();
  f.set("truth", "Add Amul milk");
  for (const x of files) f.append("files", x);
  return f;
};
const ok = (text = "Add Amul milk", provider = "sarvam", ms = 10) => ({
  text,
  provider,
  model: "mock",
  ms,
  status: "ok",
});

test("WER retains Tamil marks, Unicode equivalence, edits, repeats and punctuation", () => {
  for (const [truth, heard, expected] of [
    ["Add Amul milk", "add AMUL milk.", 0],
    ["a b", "a", 0.5],
    ["a b", "a x b", 0.5],
    ["a b", "x b", 0.5],
    ["milk milk", "milk", 0.5],
    ["", "", 0],
    ["", "milk", 1],
    ["பால்", "பால", 1],
    ["café", "cafe\u0301", 0],
    ["பால் வாங்கு", "பால் வாங்கு", 0],
  ])
    assert.equal(wer(truth, heard), expected, `${truth} -> ${heard}`);
});
test("entities reject substrings and handle phrases, duplicates and N/A", () => {
  assert.equal(entityAccuracy("Ask Dad", "Ask daddy", ["Dad"]), 0);
  assert.equal(
    entityAccuracy("BigBasket and Amul", "BigBasket", [
      "BigBasket",
      "Amul",
      "AMUL",
    ]),
    0.5,
  );
  assert.equal(entityAccuracy("T Nagar", "T, Nagar.", ["T Nagar"]), 1);
  assert.equal(entityAccuracy("பால்", "பால", ["பால்"]), 0);
  assert.equal(entityAccuracy("add eggs", "add eggs", ["Amul"]), null);
});
test("nearest-rank percentiles use correct 20-sample p95 without mutation", () => {
  const samples = Array.from({ length: 20 }, (_, i) => 20 - i);
  assert.equal(p50(samples), 10);
  assert.equal(p95(samples), 19);
  assert.equal(samples[0], 20);
  assert.equal(p50([]), 0);
  assert.equal(p95([7]), 7);
});
test("seed has 50 distinct bounded keyterms", () => {
  assert.equal(KEYTERMS.length, 50);
  assert.equal(new Set(KEYTERMS).size, 50);
  assert.ok(KEYTERMS.every((k) => k.length > 0 && Array.from(k).length <= 64));
});
test("per-clip truths match basenames and preserve metadata and options", async () => {
  const f = batch([file("one.webm"), file("two.mp4", "audio", "video/mp4")]);
  f.set(
    "manifest",
    JSON.stringify([
      {
        file: "clips/one.webm",
        truth: "Amul milk",
        tags: ["brand"],
        noise: "fan",
      },
      { file: "two.mp4", truth: "Tata salt" },
    ]),
  );
  f.set("keyterms", JSON.stringify(["Amul", "Tata"]));
  const seen = [];
  const res = await handleBakeoff(req(f), {
    sarvam: async (_, name, options) => {
      seen.push(options);
      return ok(name === "one.webm" ? "Amul milk" : "Tata salt");
    },
    elevenlabs: async () => assert.fail("not enabled"),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(
    data.results.map((r) => r.wer),
    [0, 0],
  );
  assert.equal(data.results[0].noise, "fan");
  assert.equal(data.results[0].tags[0], "brand");
  assert.equal(seen[0].language, "unknown");
  assert.equal(seen[0].mode, "codemix");
  assert.deepEqual(seen[0].keyterms, ["Amul", "Tata"]);
  assert.equal(res.headers.get("cache-control"), "no-store");
});
test("shared truth, partial failure, optional challenger and summary denominator", async () => {
  const f = batch([file("one.wav"), file("two.wav")]);
  f.set("elevenlabs", "1");
  const res = await handleBakeoff(req(f), {
    sarvam: async (_, name) =>
      name === "one.wav"
        ? ok()
        : { ...ok(), status: "error", error: "timeout", ms: 999 },
    elevenlabs: async () => ok("add eggs", "elevenlabs", 20),
  });
  const data = await res.json();
  assert.equal(data.results.length, 4);
  assert.equal(data.results[2].wer, null);
  assert.equal(data.summary[0].failed, 1);
  assert.equal(data.summary[0].p95Ms, 10);
});
test("all failures yield null summary scores and percentiles", async () => {
  const res = await handleBakeoff(req(batch()), {
    sarvam: async () => ({ ...ok(), status: "error", error: "offline" }),
    elevenlabs: async () => assert.fail(),
  });
  const data = await res.json();
  assert.equal(data.summary[0].meanWer, null);
  assert.equal(data.summary[0].p50Ms, null);
});

const invalidCases = [
  ["empty batch", () => batch([]), 400],
  [
    "too many files",
    () => batch(Array.from({ length: 81 }, (_, i) => file(`${i}.wav`))),
    400,
  ],
  ["zero byte audio", () => batch([file("one.wav", "")]), 413],
  ["non-audio extension", () => batch([file("data.json")]), 400],
  [
    "mismatched MIME",
    () => batch([file("one.wav", "x", "application/json")]),
    400,
  ],
  ["duplicate uploads", () => batch([file(), file()]), 400],
  [
    "missing truth",
    () => {
      const f = batch();
      f.delete("truth");
      return f;
    },
    400,
  ],
  [
    "blank truth",
    () => {
      const f = batch();
      f.set("truth", " ");
      return f;
    },
    400,
  ],
  [
    "oversized truth",
    () => {
      const f = batch();
      f.set("truth", "x".repeat(2001));
      return f;
    },
    400,
  ],
  [
    "malformed manifest",
    () => {
      const f = batch();
      f.set("manifest", "{");
      return f;
    },
    400,
  ],
  [
    "non-array manifest",
    () => {
      const f = batch();
      f.set("manifest", "{}");
      return f;
    },
    400,
  ],
  [
    "missing later truth",
    () => {
      const f = batch([file(), file("two.wav")]);
      f.set("manifest", '[{"file":"one.wav","truth":"milk"}]');
      return f;
    },
    400,
  ],
  [
    "duplicate manifest basenames",
    () => {
      const f = batch();
      f.set(
        "manifest",
        '[{"file":"a/one.wav","truth":"milk"},{"file":"b/one.wav","truth":"eggs"}]',
      );
      return f;
    },
    400,
  ],
  [
    "invalid tags",
    () => {
      const f = batch();
      f.set("manifest", '[{"file":"one.wav","truth":"milk","tags":[1]}]');
      return f;
    },
    400,
  ],
  [
    "bad keyterm JSON",
    () => {
      const f = batch();
      f.set("keyterms", "{");
      return f;
    },
    400,
  ],
  [
    "too many keyterms",
    () => {
      const f = batch();
      f.set(
        "keyterms",
        JSON.stringify(Array.from({ length: 51 }, (_, i) => `term${i}`)),
      );
      return f;
    },
    400,
  ],
  [
    "long keyterm",
    () => {
      const f = batch();
      f.set("keyterms", JSON.stringify(["x".repeat(65)]));
      return f;
    },
    400,
  ],
  [
    "blank keyterm",
    () => {
      const f = batch();
      f.set("keyterms", '[" "]');
      return f;
    },
    400,
  ],
  [
    "invalid mode",
    () => {
      const f = batch();
      f.set("mode", "translate");
      return f;
    },
    400,
  ],
  [
    "invalid language",
    () => {
      const f = batch();
      f.set("language", "invalid");
      return f;
    },
    400,
  ],
  [
    "oversized clip",
    () => batch([file("large.wav", new Uint8Array(10 * 1024 * 1024 + 1))]),
    413,
  ],
  [
    "oversized total",
    () =>
      batch(
        Array.from({ length: 9 }, (_, i) =>
          file(`${i}.wav`, new Uint8Array(10 * 1024 * 1024)),
        ),
      ),
    413,
  ],
];
for (const [name, make, status] of invalidCases)
  test(`rejects ${name} before paid calls`, async () => {
    const never = async () => assert.fail("paid call on invalid input");
    const res = await handleBakeoff(req(make()), {
      sarvam: never,
      elevenlabs: never,
    });
    assert.equal(res.status, status);
    assert.equal(typeof (await res.json()).error, "string");
  });
test("malformed HTTP body returns 400", async () => {
  const res = await handleBakeoff(
    new Request("https://example.invalid", { method: "POST", body: "{}" }),
  );
  assert.equal(res.status, 400);
});
test("adapters cover fields, HTTP failures, malformed schemas, silence, timeout and S0", async () => {
  const originalFetch = globalThis.fetch;
  const oldEnv = {
    SARVAM_API_KEY: process.env.SARVAM_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_S0_APPROVED: process.env.ELEVENLABS_S0_APPROVED,
  };
  try {
    globalThis.fetch = async () =>
      assert.fail("missing key or S0 must not upload");
    delete process.env.SARVAM_API_KEY;
    assert.equal((await transcribeSarvam(file(), "one.wav")).status, "error");
    process.env.ELEVENLABS_API_KEY = "mock";
    delete process.env.ELEVENLABS_S0_APPROVED;
    assert.equal(
      (await transcribeElevenlabs(file(), "one.wav")).status,
      "error",
    );
    process.env.SARVAM_API_KEY = "mock";
    globalThis.fetch = async (url, opts) => {
      assert.equal(url, "https://api.sarvam.ai/speech-to-text");
      assert.equal(opts.body.get("model"), "saaras:v4");
      assert.equal(opts.body.get("mode"), "codemix");
      assert.equal(opts.body.get("language_code"), "unknown");
      assert.ok(opts.signal);
      assert.equal(JSON.parse(opts.body.get("keyterms")).length, 50);
      return Response.json({ transcript: "Amul milk" });
    };
    assert.equal((await transcribeSarvam(file(), "one.wav")).text, "Amul milk");
    for (const status of [400, 403, 422, 429, 500, 503]) {
      globalThis.fetch = async () =>
        Response.json({ error: { message: "private transcript" } }, { status });
      const result = await transcribeSarvam(file(), "one.wav");
      assert.equal(result.status, "error");
      assert.equal(result.error, `Provider HTTP ${status}`);
    }
    for (const data of [{}, { transcript: 123 }]) {
      globalThis.fetch = async () => Response.json(data);
      assert.equal((await transcribeSarvam(file(), "one.wav")).status, "error");
    }
    globalThis.fetch = async () => new Response("not JSON");
    assert.equal((await transcribeSarvam(file(), "one.wav")).status, "error");
    globalThis.fetch = async () => Response.json({ transcript: "" });
    assert.equal((await transcribeSarvam(file(), "one.wav")).status, "ok");
    globalThis.fetch = async () => {
      throw new DOMException("timeout", "TimeoutError");
    };
    assert.match(
      (await transcribeSarvam(file(), "one.wav")).error,
      /timed out/,
    );
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };
    assert.equal((await transcribeSarvam(file(), "one.wav")).status, "error");
    process.env.ELEVENLABS_S0_APPROVED = "true";
    globalThis.fetch = async (_, opts) => {
      assert.equal(opts.body.get("model_id"), "scribe_v2");
      return Response.json({ text: "milk" });
    };
    assert.equal((await transcribeElevenlabs(file(), "one.wav")).text, "milk");
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("digital-silence guard preserves quiet signals and rejects malformed WAV assumptions", async () => {
  const { isSilentPcmWav, providerAudio } = require(
    join(compiled, "stt/audio.js"),
  );
  const wav = Buffer.alloc(48);
  wav.write("RIFF");
  wav.writeUInt32LE(40, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(4, 40);
  assert.equal(await isSilentPcmWav(new Blob([wav])), true);
  const quiet = Buffer.from(wav);
  quiet[44] = 1;
  assert.equal(await isSilentPcmWav(new Blob([quiet])), false);
  const malformed = Buffer.from(wav);
  malformed.writeUInt32LE(999, 40);
  assert.equal(await isSilentPcmWav(new Blob([malformed])), false);
  const otherCodec = Buffer.from(wav);
  otherCodec.writeUInt16LE(3, 20);
  assert.equal(await isSilentPcmWav(new Blob([otherCodec])), false);
  assert.equal(await isSilentPcmWav(new Blob(["fake WAV"])), false);
  assert.equal(
    providerAudio(new Blob(["mp4"], { type: "video/mp4" }), "phone.mp4").type,
    "audio/mp4",
  );
  assert.equal(
    providerAudio(new Blob(["webm"], { type: "video/webm" }), "phone.webm")
      .type,
    "audio/webm",
  );
  const originalFetch = globalThis.fetch;
  const oldKey = process.env.SARVAM_API_KEY;
  try {
    process.env.SARVAM_API_KEY = "mock";
    globalThis.fetch = async () =>
      assert.fail("digital silence must not call provider");
    const result = await transcribeSarvam(new Blob([wav]), "silence.wav");
    assert.equal(result.status, "error");
    assert.match(result.error, /no speech/);
    assert.equal(result.ms, 0);
    assert.equal(result.text, "");
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.SARVAM_API_KEY;
    else process.env.SARVAM_API_KEY = oldKey;
  }
});
