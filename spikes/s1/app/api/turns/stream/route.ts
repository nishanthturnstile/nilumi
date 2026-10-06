import { SSE_SCRIPT } from "@/lib/turn-script";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const turnId = url.searchParams.get("turn_id") ?? "t1";
  // Client-side seq dedupe: on reconnect the client passes maxPlayedSeq;
  // we resend only newer speech.ready events. Idempotent: same seq → same URL.
  const maxPlayed = Number(url.searchParams.get("max_played") ?? "0");

  const encoder = new TextEncoder();
  let lastId = 0;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown, id?: number) => {
        if (id !== undefined) lastId = id;
        controller.enqueue(
          encoder.encode(`${id !== undefined ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };
      send("turn.started", { turn_id: turnId });
      for (const item of SSE_SCRIPT) {
        await new Promise((r) => setTimeout(r, item.delayMs));
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
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
