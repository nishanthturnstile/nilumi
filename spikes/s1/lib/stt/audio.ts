// Deliberately narrow: exact digital silence in 16-bit PCM WAV only.
// Do not threshold quiet speech or pretend this is VAD for compressed audio.
export async function isSilentPcmWav(audio: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await audio.arrayBuffer());
  if (bytes.length < 44) return false;
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (
    ascii(0, 4) !== "RIFF" ||
    ascii(8, 4) !== "WAVE" ||
    view.getUint32(4, true) + 8 !== bytes.length
  )
    return false;
  let pcm16 = false;
  let data: Uint8Array | null = null;
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const length = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + length > bytes.length) return false;
    const kind = ascii(offset, 4);
    if (kind === "fmt " && length >= 16) {
      pcm16 =
        view.getUint16(start, true) === 1 &&
        view.getUint16(start + 14, true) === 16;
    }
    if (kind === "data") {
      if (data) return false;
      data = bytes.subarray(start, start + length);
    }
    offset = start + length + (length % 2);
  }
  return (
    pcm16 &&
    data !== null &&
    data.length > 0 &&
    data.length % 2 === 0 &&
    data.every((byte) => byte === 0)
  );
}

export function providerAudio(audio: Blob, filename: string): Blob {
  if (/\.(mp4|m4a)$/i.test(filename))
    return new Blob([audio], { type: "audio/mp4" });
  if (/\.webm$/i.test(filename) && audio.type === "video/webm")
    return new Blob([audio], { type: "audio/webm" });
  return audio;
}
