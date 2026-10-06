export const dynamic = "force-dynamic";

// Synthetic per-sentence clip: a short sine beep at a different pitch per seq.
// Mirrors the production contract loosely (idempotent per seq, no-store).
function wavForSeq(seq: number): Buffer {
  const sampleRate = 16000;
  const seconds = 0.5;
  const n = Math.floor(sampleRate * seconds);
  const freq = 440 + seq * 180;
  const dataSize = n * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const s = Math.sin(2 * Math.PI * freq * t) * 0.4 * 32767;
    buffer.writeInt16LE(Math.round(s), 44 + i * 2);
  }
  return buffer;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ seq: string }> }
) {
  const { seq } = await params;
  const n = Number(seq);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2) {
    return new Response("bad seq", { status: 400 });
  }
  const wav = wavForSeq(n);
  const headers = new Headers({
    "Content-Type": "audio/wav",
    "Cache-Control": "no-store, no-transform",
    "Accept-Ranges": "bytes",
    "Content-Length": String(wav.length),
  });
  // iOS probes media with bytes=0-1, then requests the rest of the file.
  // Support a single closed, open-ended, or suffix range. Unsupported range
  // units and multipart ranges are ignored, returning the full representation.
  const range = req.headers.get("Range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return new Response(new Uint8Array(wav), { headers });
  const suffix = match[1] === "";
  const first = Number(suffix ? match[2] : match[1]);
  const last = match[2] === "" ? wav.length - 1 : Number(match[2]);
  const start = suffix ? Math.max(0, wav.length - first) : first;
  const end = suffix ? wav.length - 1 : Math.min(last, wav.length - 1);
  if ((!match[1] && !match[2]) || !Number.isSafeInteger(first) || !Number.isSafeInteger(last) ||
    start >= wav.length || start > end || (suffix && first === 0)) {
    headers.set("Content-Range", `bytes */${wav.length}`);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, headers });
  }
  headers.set("Content-Range", `bytes ${start}-${end}/${wav.length}`);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(new Uint8Array(wav.subarray(start, end + 1)), { status: 206, headers });
}
