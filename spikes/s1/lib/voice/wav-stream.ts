import { TTS_SETTINGS } from "../../config/voice";

// Browser-independent incremental RIFF parser. Audio transport chunks are not
// file boundaries. Preserve split headers, sample alignment and unknown lengths.
export class WavStreamDecoder {
  private pending = new Uint8Array(0);
  private state: "riff" | "chunk" | "body" | "pad" = "riff";
  private kind = "";
  private remaining = 0;
  private unknown = false;
  private size = 0;
  private format = false;
  private data = false;
  private received = 0;
  private expected: number | null = null;
  private frames = 0;
  private onset: number | null = null;
  private total = 0;
  constructor(private rate = TTS_SETTINGS.speech_sample_rate) {}
  push(input: Uint8Array): Uint8Array[] {
    this.total += input.length;
    if (this.total > 3_000_000) throw new Error("invalid_provider_audio");
    const merged = new Uint8Array(this.pending.length + input.length);
    merged.set(this.pending);
    merged.set(input, this.pending.length);
    this.pending = merged;
    const audio: Uint8Array[] = [];
    const consume = (n: number) => {
      const bytes = this.pending.slice(0, n);
      this.pending = this.pending.subarray(n);
      return bytes;
    };
    const word = (n: number) =>
      String.fromCharCode(...this.pending.subarray(0, n));
    while (this.pending.length) {
      if (this.state === "riff") {
        if (this.pending.length < 12) break;
        const header = consume(12),
          view = new DataView(header.buffer);
        if (
          String.fromCharCode(...header.subarray(0, 4)) !== "RIFF" ||
          String.fromCharCode(...header.subarray(8, 12)) !== "WAVE"
        )
          throw new Error("invalid_provider_audio");
        const size = view.getUint32(4, true);
        this.expected = size === 0 || size === 0xffffffff ? null : size + 8;
        this.state = "chunk";
      } else if (this.state === "chunk") {
        if (this.pending.length < 8) break;
        this.kind = word(4);
        const header = consume(8);
        this.size = new DataView(header.buffer).getUint32(4, true);
        this.unknown =
          this.kind === "data" &&
          (this.size === 0xffffffff ||
            (this.size === 0 && this.expected === null));
        if (this.kind === "data") {
          if (!this.format || this.data || (!this.unknown && this.size % 2))
            throw new Error("invalid_provider_audio");
          this.data = true;
        } else if (this.size > 65_536)
          throw new Error("invalid_provider_audio");
        this.remaining = this.size;
        this.state = "body";
      } else if (this.state === "pad") {
        consume(1);
        this.state = "chunk";
      } else if (this.kind === "fmt ") {
        if (this.size < 16 || this.size > 64 || this.format)
          throw new Error("invalid_provider_audio");
        if (this.pending.length < this.remaining) break;
        const bytes = consume(this.remaining),
          view = new DataView(bytes.buffer);
        if (
          view.getUint16(0, true) !== 1 ||
          view.getUint16(2, true) !== 1 ||
          view.getUint32(4, true) !== this.rate ||
          view.getUint32(8, true) !== this.rate * 2 ||
          view.getUint16(12, true) !== 2 ||
          view.getUint16(14, true) !== 16
        )
          throw new Error("invalid_provider_audio");
        this.format = true;
        this.remaining = 0;
        this.state = this.size % 2 ? "pad" : "chunk";
      } else if (this.kind === "data") {
        const count = Math.min(
          this.pending.length,
          this.unknown ? Infinity : this.remaining,
        );
        const aligned = count - (count % 2);
        if (!aligned) break;
        const bytes = consume(aligned),
          view = new DataView(bytes.buffer);
        for (let i = 0; i < bytes.length; i += 2) {
          if (this.onset === null && Math.abs(view.getInt16(i, true)) >= 164)
            this.onset = this.frames + i / 2;
        }
        this.frames += bytes.length / 2;
        this.received += bytes.length;
        audio.push(bytes);
        if (!this.unknown) {
          this.remaining -= aligned;
          if (!this.remaining) this.state = "chunk";
        }
      } else {
        const count = Math.min(this.pending.length, this.remaining);
        consume(count);
        this.remaining -= count;
        if (!this.remaining) this.state = this.size % 2 ? "pad" : "chunk";
      }
    }
    return audio;
  }
  finish() {
    if (
      !this.format ||
      !this.data ||
      !this.received ||
      this.pending.length ||
      (this.state !== "chunk" &&
        !(this.state === "body" && this.kind === "data" && this.unknown)) ||
      (this.expected !== null && this.total !== this.expected)
    )
      throw new Error("invalid_provider_audio");
    if (this.onset === null) throw new Error("silent_provider_audio");
    return {
      leadingSilenceMs: (this.onset / this.rate) * 1000,
      pcmBytes: this.received,
    };
  }
}
