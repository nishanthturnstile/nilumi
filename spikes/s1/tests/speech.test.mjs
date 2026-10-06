import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/speech/[seq]/route.ts";

function get(range, seq = "1") {
  return GET(new Request(`https://example.invalid/api/speech/${seq}`, {
    headers: range ? { Range: range } : {},
  }), { params: Promise.resolve({ seq }) });
}

test("full WAV has accurate lengths and remains deterministic", async () => {
  const res = await get();
  const wav = Buffer.from(await res.arrayBuffer());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "audio/wav");
  assert.equal(res.headers.get("cache-control"), "no-store, no-transform");
  assert.equal(res.headers.get("accept-ranges"), "bytes");
  assert.equal(Number(res.headers.get("content-length")), wav.length);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(4) + 8, wav.length);
  assert.equal(wav.readUInt32LE(40) + 44, wav.length);
  assert.deepEqual(Buffer.from(await (await get()).arrayBuffer()), wav);
  assert.notDeepEqual(Buffer.from(await (await get(undefined, "2")).arrayBuffer()), wav);
});

test("Safari two-byte probe gets exactly the requested bytes", async () => {
  const res = await get("bytes=0-1");
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("content-range"), "bytes 0-1/16044");
  assert.equal(res.headers.get("content-length"), "2");
  assert.equal(Buffer.from(await res.arrayBuffer()).toString(), "RI");
});

test("open-ended, suffix and clamped ranges reconstruct the WAV", async () => {
  const full = Buffer.from(await (await get()).arrayBuffer());
  for (const [range, start, end] of [
    ["bytes=2-", 2, full.length - 1],
    ["bytes=-100", full.length - 100, full.length - 1],
    ["bytes=16000-99999", 16000, full.length - 1],
    ["bytes=-99999", 0, full.length - 1],
  ]) {
    const res = await get(range);
    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-range"), `bytes ${start}-${end}/${full.length}`);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), full.subarray(start, end + 1));
  }
});

test("unsatisfiable ranges return 416 with the representation length", async () => {
  for (const range of ["bytes=16044-", "bytes=4-2", "bytes=-0", "bytes=-", "bytes=99999999999999999999-"]) {
    const res = await get(range);
    assert.equal(res.status, 416, range);
    assert.equal(res.headers.get("content-range"), "bytes */16044");
    assert.equal(res.headers.get("content-length"), "0");
    assert.equal((await res.arrayBuffer()).byteLength, 0);
  }
});

test("unsupported units or multipart ranges fall back to a full response", async () => {
  for (const range of ["items=0-1", "bytes=0-1,4-5"]) {
    const res = await get(range);
    assert.equal(res.status, 200);
    assert.equal((await res.arrayBuffer()).byteLength, 16044);
  }
});

test("only the two scripted clips are available", async () => {
  for (const seq of ["0", "3", "NaN", "1.5"]) assert.equal((await get(undefined, seq)).status, 400);
});
