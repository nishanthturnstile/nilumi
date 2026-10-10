import { AsyncLocalStorage } from "node:async_hooks";
import { channel } from "node:diagnostics_channel";
import type { LedgerTiming } from "../verification/ledger";

type DisconnectReason =
  | "local-idle-timeout"
  | "remote-close"
  | "aborted"
  | "protocol-reset"
  | "client-shutdown"
  | "socket-error"
  | "unknown";
type Disconnect = { at: number; reason: DisconnectReason };
const events = globalThis as typeof globalThis & {
  __nilumiS4Disconnects?: Map<string, Disconnect>;
};
events.__nilumiS4Disconnects ??= new Map();
const disconnects = events.__nilumiS4Disconnects;
export function noteProviderDisconnect(
  origin: string,
  error: Error & { code?: string },
) {
  const reason: DisconnectReason =
    error.code === "UND_ERR_INFO"
      ? error.message === "socket idle timeout"
        ? "local-idle-timeout"
        : error.message === "aborted"
          ? "aborted"
          : error.message === "reset"
            ? "protocol-reset"
            : "unknown"
      : error.code === "UND_ERR_DESTROYED" || error.code === "UND_ERR_CLOSED"
        ? "client-shutdown"
        : error.code === "UND_ERR_SOCKET"
          ? error.message === "other side closed"
            ? "remote-close"
            : "socket-error"
          : "unknown";
  // Store only a classification and time; never retain raw errors or their socket info.
  disconnects.set(origin, { at: performance.now(), reason });
  if (disconnects.size > 16)
    disconnects.delete(disconnects.keys().next().value as string);
}

export type ProviderConnection = {
  socketId: number;
  reused: boolean;
  idleBeforeMs: number | null;
  requestToSocketMs: number;
  socketToHeadersMs: number | null;
  protocol: "h2" | "http/1.1" | null;
};
export type ProviderTrace = {
  firstBodyMs?: number;
  requestId?: string;
  previousCompletionGapMs?: number;
  connection?: ProviderConnection;
  previousDisconnect?: { gapMs: number; reason: DisconnectReason };
  poolPolicy?: {
    connections: number;
    pipelining: number;
    keepAliveTimeout: number;
    keepAliveMaxTimeout: number;
    keepAliveTimeoutThreshold: number;
    allowH2: boolean;
    serverIdleHintMs: number | null;
    serverCloses: boolean;
    effectiveIdleMs: number;
  };
  decoderProcessingMs?: number;
  decoderFirstPcmProcessingMs?: number;
  firstRawBytes?: number;
  firstRawPcmBytes?: number;
};
export type ServerTrace = {
  schema: "s4-latency-1";
  authMs: number;
  descriptorMs?: number;
  descriptorSource?: "prepared" | "memory" | "disk";
  queueWaitMs?: number;
  ledgerMs?: number;
  reservationMs?: number;
  ledgerStages?: LedgerTiming;
  providerDispatchMs?: number;
  firstPcmMs?: number;
  responseReadyMs?: number;
  providerEofMs?: number;
  persistenceMs?: number;
  outcome: "pending" | "complete" | "failed" | "cancelled";
  provider: ProviderTrace;
  descriptorCancelled?: boolean;
  sharedProducer?: boolean;
};

type TrackedRequest = {
  trace: ProviderTrace;
  started: number;
  origin: string;
  sent?: number;
  socket?: SocketState;
};
type SocketState = { id: number; requests: number; lastEnd?: number };

class ProviderMonitor {
  readonly context = new AsyncLocalStorage<TrackedRequest>();
  private requests = new WeakMap<object, TrackedRequest>();
  private sockets = new WeakMap<object, SocketState>();
  private sequence = 0;
  private completions = new Map<string, number>();
  constructor() {
    // Deliberately retain no URLs, text, headers, bodies, credentials or emails.
    channel("undici:request:create").subscribe((event) => {
      const { request } = event as { request: object & { origin: string } };
      const current = this.context.getStore();
      if (current && String(request.origin) === current.origin) {
        const previous = this.completions.get(current.origin);
        if (previous !== undefined && previous <= current.started)
          current.trace.previousCompletionGapMs = current.started - previous;
        this.requests.set(request, current);
      }
    });
    channel("undici:client:sendHeaders").subscribe((event) => {
      const { request, socket } = event as {
        request: object;
        socket: object & { alpnProtocol?: string };
      };
      const current = this.requests.get(request);
      if (!current) return;
      let state = this.sockets.get(socket);
      if (!state) {
        state = { id: ++this.sequence, requests: 0 };
        this.sockets.set(socket, state);
      }
      const now = performance.now();
      current.sent = now;
      current.socket = state;
      current.trace.connection = {
        socketId: state.id,
        reused: state.requests++ > 0,
        idleBeforeMs:
          state.lastEnd === undefined ? null : Math.max(0, now - state.lastEnd),
        requestToSocketMs: Math.max(0, now - current.started),
        socketToHeadersMs: null,
        protocol:
          socket.alpnProtocol === "h2"
            ? "h2"
            : socket.alpnProtocol === "http/1.1"
              ? "http/1.1"
              : null,
      };
    });
    channel("undici:request:headers").subscribe((event) => {
      const { request } = event as { request: object };
      const current = this.requests.get(request);
      if (current?.trace.connection && current.sent !== undefined)
        current.trace.connection.socketToHeadersMs = Math.max(
          0,
          performance.now() - current.sent,
        );
    });
    channel("undici:request:trailers").subscribe((event) => {
      const { request } = event as { request: object };
      const current = this.requests.get(request);
      if (current?.socket) current.socket.lastEnd = performance.now();
      if (current) {
        this.completions.set(current.origin, performance.now());
        if (this.completions.size > 16)
          this.completions.delete(
            this.completions.keys().next().value as string,
          );
      }
      this.requests.delete(request);
    });
    channel("undici:request:error").subscribe((event) => {
      const { request } = event as { request: object };
      this.requests.delete(request);
    });
  }
}
// Next route bundles/hot reloads must not register duplicate global listeners.
const shared = globalThis as typeof globalThis & {
  __nilumiS4ProviderMonitor?: ProviderMonitor;
};
if (!shared.__nilumiS4ProviderMonitor)
  shared.__nilumiS4ProviderMonitor = new ProviderMonitor();
const monitor = shared.__nilumiS4ProviderMonitor;
export function traceProviderRequest<T>(
  trace: ProviderTrace,
  run: () => Promise<T>,
  origin = "https://api.sarvam.ai",
) {
  const previous = disconnects.get(origin);
  if (previous)
    trace.previousDisconnect = {
      gapMs: Math.max(0, performance.now() - previous.at),
      reason: previous.reason,
    };
  return monitor.context.run(
    { trace, origin, started: performance.now() },
    run,
  );
}
