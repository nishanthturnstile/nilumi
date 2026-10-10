// A bounded spool lets simultaneous GETs replay/join one billable operation.
// Each reader has its own cursor; slow/disconnected readers cannot hold synthesis.
export class ReplayAudio {
  private chunks: Uint8Array[] = [];
  private total = 0;
  private complete = false;
  private error: Error | null = null;
  private waiters = new Set<() => void>();
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private resolveDone!: () => void;
  private rejectDone!: (error: Error) => void;
  readers = 0;
  cached = false;
  readonly ready = new Promise<void>((resolve, reject) => {
    this.resolveReady = resolve;
    this.rejectReady = reject;
  });
  readonly done = new Promise<void>((resolve, reject) => {
    this.resolveDone = resolve;
    this.rejectDone = reject;
  });
  constructor() {
    // Completion may precede a range/status caller attaching its handler.
    void this.ready.catch(() => {});
    void this.done.catch(() => {});
  }
  get settled() {
    return this.complete || this.error !== null;
  }
  append(bytes: Uint8Array) {
    if (this.settled || !bytes.length || this.total + bytes.length > 3_000_000)
      throw new Error("invalid_audio_stream");
    this.chunks.push(bytes.slice());
    this.total += bytes.length;
    this.resolveReady();
    this.wake();
  }
  bytes() {
    const bytes = new Uint8Array(this.total);
    let offset = 0;
    for (const chunk of this.chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  }
  finish() {
    this.complete = true;
    this.resolveDone();
    this.wake();
  }
  fail(error: Error) {
    this.error = error;
    this.rejectReady(error);
    this.rejectDone(error);
    this.wake();
  }
  private wake() {
    for (const resolve of this.waiters) resolve();
    this.waiters.clear();
  }
  open(signal: AbortSignal, onDetach: () => void) {
    this.readers++;
    let index = 0,
      closed = false,
      wake: (() => void) | undefined;
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const detach = () => {
      if (closed) return;
      closed = true;
      this.readers--;
      signal.removeEventListener("abort", abort);
      if (wake) {
        this.waiters.delete(wake);
        wake();
      }
      onDetach();
    };
    const abort = () => {
      if (closed) return;
      controller.error(new Error("audio_request_cancelled"));
      detach();
    };
    return new ReadableStream<Uint8Array>({
      start: (c) => {
        controller = c;
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
      },
      pull: async (c) => {
        while (!closed) {
          if (this.error) {
            c.error(this.error);
            detach();
            return;
          }
          if (index < this.chunks.length) {
            c.enqueue(this.chunks[index++].slice());
            return;
          }
          if (this.complete) {
            c.close();
            detach();
            return;
          }
          await new Promise<void>((resolve) => {
            wake = resolve;
            this.waiters.add(resolve);
          });
        }
      },
      cancel: detach,
    });
  }
}
