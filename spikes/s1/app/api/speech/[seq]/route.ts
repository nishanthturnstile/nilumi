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
  _req: Request,
  { params }: { params: Promise<{ seq: string }> }
) {
  const { seq } = await params;
  const n = Number(seq);
  if (!Number.isInteger(n) || n < 1) {
    return new Response("bad seq", { status: 400 });
  }
  return new Response(new Uint8Array(wavForSeq(n)), {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  });
}
