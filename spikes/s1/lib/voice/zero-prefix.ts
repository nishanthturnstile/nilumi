import { ZERO_PREFIX_POLICY } from "../../config/voice";

// Only exact zero samples in the first complete PCM chunk are eligible. Never
// wait for another chunk, remove quiet speech, or alter an internal pause.
export function zeroPrefixFrames(bytes: Uint8Array, rate: number): number {
  const frames = Math.floor(bytes.length / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, frames * 2);
  let zeros = 0;
  while (zeros < frames && view.getInt16(zeros * 2, true) === 0) zeros++;
  // Preserve all-zero chunks: withholding them could cause a streaming underrun.
  if (zeros === frames) return 0;
  return Math.min(
    Math.floor((rate * ZERO_PREFIX_POLICY.maximumTrimMs) / 1000),
    Math.max(
      0,
      frames -
        Math.ceil((rate * ZERO_PREFIX_POLICY.minimumRemainingChunkMs) / 1000),
    ),
    Math.max(
      0,
      zeros - Math.ceil((rate * ZERO_PREFIX_POLICY.retainedMs) / 1000),
    ),
  );
}
