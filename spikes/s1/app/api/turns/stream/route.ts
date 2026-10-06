import { SSE_SCRIPT } from "@/lib/turn-script";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const turnId = url.searchParams.get("turn_id") ?? "t1";
  const maxPlayed = Number(url.searchParams.get("max_played") ?? "0");
  if (!Number.isSafeInteger(maxPlayed) || maxPlayed < 0) {
    return new Response("bad max_played", { status: 400 });
  }
  const encoder = new TextEncoder();
  let cancelled = req.signal.aborted;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let wake: (() => void) | undefined;
  const cancel = () => {
    cancelled = true;
    clearTimeout(timer);
    wake?.();
    req.signal.removeEventListener("abort", cancel);
  };
  req.signal.addEventListener("abort", cancel, { once: true });
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown, id?: number) => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(
          `${id !== undefined ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        ));
      };
      try {
        send("turn.started", { turn_id: turnId });
        for (const item of SSE_SCRIPT) {
          if (cancelled) return;
          await new Promise<void>((resolve) => {
            wake = resolve;
            timer = setTimeout(resolve, item.delayMs);
          });
          if (cancelled) return;
          if (item.kind === "speech" && item.seq <= maxPlayed) continue;
          send(
            item.kind === "speech" ? "speech.ready" : "sentence.validated",
            item.kind === "speech"
              ? { turn_id: turnId, seq: item.seq, url: `/api/speech/${item.seq}` }
              : { turn_id: turnId, seq: item.seq, text: item.text },
            item.kind === "speech" ? item.seq : undefined
          );
        }
        send("turn.done", { turn_id: turnId });
        controller.close();
      } finally {
        req.signal.removeEventListener("abort", cancel);
      }
    },
    cancel,
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
