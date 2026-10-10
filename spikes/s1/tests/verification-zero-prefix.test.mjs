import assert from "node:assert/strict";
import test from "node:test";
import { PcmPlayer } from "../lib/voice/playback.ts";
import { zeroPrefixFrames } from "../lib/voice/zero-prefix.ts";

function samples(values) {
  const bytes = Buffer.alloc(values.length * 2);
  values.forEach((value, i) => {
    bytes.writeInt16LE(value, i * 2);
  });
  return bytes;
}
test("zero-prefix removal retains 10 ms and every quiet non-zero sample", () => {
  const values = [
    ...Array(167).fill(0),
    1,
    -1,
    16,
    164,
    900,
    0,
    0,
    -500,
    ...Array(100).fill(500),
  ];
  const bytes = samples(values);
  const removed = zeroPrefixFrames(bytes, 1000);
  assert.equal(removed, 157);
  assert.deepEqual(
    [...bytes.subarray(removed * 2)],
    [...samples(values.slice(157))],
  );
  assert.deepEqual([...bytes], [...samples(values)]);
});
test("prefix removal is capped, preserves short lead-ins and all-zero chunks", () => {
  assert.equal(
    zeroPrefixFrames(samples([...Array(500).fill(0), 1]), 1000),
    200,
  );
  assert.equal(zeroPrefixFrames(samples([...Array(9).fill(0), 1]), 1000), 0);
  assert.equal(zeroPrefixFrames(samples(Array(1000).fill(0)), 1000), 0);
  assert.equal(zeroPrefixFrames(samples([1, 0, 0, 164]), 1000), 0);
});
test("unaligned PCM views and odd network fragments preserve sample boundaries", () => {
  const original = samples([
    ...Array(167).fill(0),
    1,
    -1,
    164,
    ...Array(100).fill(500),
  ]);
  const outer = Buffer.concat([Buffer.from([99]), original, Buffer.from([98])]);
  assert.equal(zeroPrefixFrames(outer.subarray(1, -1), 1000), 157);
  const { player, buffers } = playback();
  player.begin();
  player.push(original.subarray(0, 1), 1000);
  player.push(original.subarray(1), 1000);
  assert.equal(player.trimmedZeroPrefixMs, 157);
  assert.deepEqual(
    [...buffers[0]],
    [
      ...Array(10).fill(0),
      1 / 32768,
      -1 / 32768,
      164 / 32768,
      ...Array(100).fill(500 / 32768),
    ],
  );
});
function playback() {
  const buffers = [];
  const context = {
    state: "running",
    currentTime: 1,
    createBuffer: (_, frames) => {
      const data = new Float32Array(frames);
      buffers.push(data);
      return { getChannelData: () => data };
    },
    createBufferSource: () => ({
      connect() {},
      disconnect() {},
      start() {},
      stop() {},
    }),
  };
  return { player: new PcmPlayer(context), buffers };
}
test("playback trims once, preserves internal pauses and reports original onset", () => {
  const { player, buffers } = playback();
  player.begin();
  player.push(
    samples([...Array(167).fill(0), 1, 164, ...Array(100).fill(500)]),
    1000,
  );
  const second = samples([...Array(100).fill(0), 900]);
  player.push(second, 1000);
  assert.equal(buffers[1].length, 101);
  assert.equal(player.leadingSilenceMs, 11);
  assert.equal(player.trimmedZeroPrefixMs + player.leadingSilenceMs, 168);
  player.stop();
  player.begin();
  player.push(samples([164]), 1000);
  assert.equal(player.trimmedZeroPrefixMs, 0);
});
test("an all-zero first chunk is played immediately; later chunks are never trimmed", () => {
  const { player, buffers } = playback();
  player.begin();
  player.push(samples(Array(100).fill(0)), 1000);
  player.push(samples([...Array(167).fill(0), 164]), 1000);
  assert.equal(buffers[0].length, 100);
  assert.equal(buffers[1].length, 168);
  assert.equal(player.trimmedZeroPrefixMs, 0);
  assert.equal(player.leadingSilenceMs, 267);
});
test("small initial chunks retain at least 80 ms of playable data", () => {
  assert.equal(
    zeroPrefixFrames(samples([...Array(100).fill(0), 164]), 1000),
    21,
  );
  assert.equal(zeroPrefixFrames(samples([...Array(60).fill(0), 164]), 1000), 0);
});
