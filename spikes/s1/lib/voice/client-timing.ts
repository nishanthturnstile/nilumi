// Optional, bounded diagnostics. No text, URLs, task attribution or audio samples.
export type AudioTrace = {
  firstSchedule?: {
    atMs: number;
    contextTimeMs: number;
    state: string;
    sourceStartContextMs: number;
    frames: number;
  };
  onsetDetection?: {
    atMs: number;
    contextTimeMs: number;
    scheduledContextMs: number;
    sampleOffsetMs: number;
  };
  outputMapping?: {
    capturedAtMs: number;
    contextTimeMs: number;
    state: string;
    scheduledContextMs: number;
    timestampContextMs: number | null;
    timestampPerformanceMs: number | null;
    mappedOnsetMs: number;
  };
};

type TimingEntry = Pick<
  PerformanceResourceTiming,
  | "startTime"
  | "fetchStart"
  | "workerStart"
  | "requestStart"
  | "responseStart"
  | "responseEnd"
  | "domainLookupStart"
  | "domainLookupEnd"
  | "connectStart"
  | "connectEnd"
  | "secureConnectionStart"
  | "nextHopProtocol"
> & { finalResponseHeadersStart?: number };

export function resourceTrace(
  entry: TimingEntry,
  origin: number,
  fetchCalledMs: number | undefined,
  fetchResolvedMs: number | undefined,
) {
  const offset = (value: number | undefined, zeroIsAbsent = false) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    !(zeroIsAbsent && value === 0)
      ? value - origin
      : null;
  const request = offset(entry.requestStart, true);
  const response = offset(entry.responseStart, true);
  const finalHeaders = offset(entry.finalResponseHeadersStart, true);
  const headers = finalHeaders ?? response;
  return {
    dnsMs: entry.domainLookupEnd - entry.domainLookupStart,
    connectMs: entry.connectEnd - entry.connectStart,
    tlsMs:
      entry.secureConnectionStart > 0
        ? entry.connectEnd - entry.secureConnectionStart
        : null,
    requestToHeadersMs:
      request !== null && response !== null ? response - request : null,
    protocol: entry.nextHopProtocol || null,
    startMs: offset(entry.startTime),
    fetchStartMs: offset(entry.fetchStart),
    workerStartMs: offset(entry.workerStart, true),
    requestStartMs: request,
    responseStartMs: response,
    finalResponseHeadersStartMs: finalHeaders,
    responseEndMs: offset(entry.responseEnd, true),
    finalResponseHeadersSupported:
      typeof entry.finalResponseHeadersStart === "number",
    headersTimestampSource:
      finalHeaders !== null
        ? ("final-response" as const)
        : response !== null
          ? ("first-response" as const)
          : null,
    beforeRequestMs:
      request !== null && fetchCalledMs !== undefined
        ? request - fetchCalledMs
        : null,
    afterHeadersMs:
      headers !== null && fetchResolvedMs !== undefined
        ? fetchResolvedMs - headers
        : null,
  };
}

export type LongTaskTrace = {
  status: "recorded" | "unsupported" | "unavailable";
  count: number | null;
  overlapMs: number | null;
  maxDurationMs: number | null;
  beforeFirstChunkMs: number | null;
  afterFirstChunkMs: number | null;
  throughMs: number;
  truncated: boolean;
};

// At most 128 numeric task intervals per attempt, never attribution/name fields.
// No timer or polling. Unsupported/failed observation never becomes zero work.
export class LongTaskCapture {
  private observer: PerformanceObserver | undefined;
  private intervals: { start: number; end: number }[] = [];
  private status: LongTaskTrace["status"] = "unsupported";
  private truncated = false;
  constructor(private readonly origin: number) {
    try {
      if (
        typeof PerformanceObserver === "undefined" ||
        !PerformanceObserver.supportedEntryTypes?.includes("longtask")
      )
        return;
      this.status = "unavailable";
      this.observer = new PerformanceObserver((list) => {
        try {
          this.collect(list.getEntries());
        } catch {
          this.status = "unavailable";
        }
      });
      this.observer.observe({ type: "longtask" });
      this.status = "recorded";
    } catch {
      this.status = "unavailable";
      try {
        this.observer?.disconnect();
      } catch {
        /* Diagnostics must not affect audio. */
      }
    }
  }
  private collect(entries: PerformanceEntry[]) {
    for (const entry of entries) {
      const start = entry.startTime - this.origin;
      const end = start + entry.duration;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= 0)
        continue;
      if (this.intervals.length === 128) {
        this.truncated = true;
        break;
      }
      this.intervals.push({ start, end });
    }
  }
  finish(firstChunkMs: number | null, throughMs: number): LongTaskTrace {
    try {
      if (this.status === "recorded" && this.observer)
        this.collect(this.observer.takeRecords());
    } catch {
      this.status = "unavailable";
    } finally {
      try {
        this.observer?.disconnect();
      } catch {
        this.status = "unavailable";
      }
    }
    const result: LongTaskTrace = {
      status: this.status,
      count: null,
      overlapMs: null,
      maxDurationMs: null,
      beforeFirstChunkMs: null,
      afterFirstChunkMs: null,
      throughMs,
      truncated: this.truncated,
    };
    if (this.status !== "recorded") return result;
    result.count = 0;
    result.overlapMs = 0;
    result.maxDurationMs = 0;
    result.beforeFirstChunkMs = firstChunkMs === null ? null : 0;
    result.afterFirstChunkMs = firstChunkMs === null ? null : 0;
    const overlap = (start: number, end: number, a: number, b: number) =>
      Math.max(0, Math.min(end, b) - Math.max(start, a));
    for (const { start, end } of this.intervals) {
      const duration = overlap(start, end, 0, throughMs);
      if (!duration) continue;
      result.count++;
      result.overlapMs += duration;
      result.maxDurationMs = Math.max(result.maxDurationMs, end - start);
      if (firstChunkMs !== null) {
        result.beforeFirstChunkMs =
          (result.beforeFirstChunkMs ?? 0) +
          overlap(start, end, 0, Math.min(firstChunkMs, throughMs));
        result.afterFirstChunkMs =
          (result.afterFirstChunkMs ?? 0) +
          overlap(start, end, Math.max(0, firstChunkMs), throughMs);
      }
    }
    return result;
  }
}
