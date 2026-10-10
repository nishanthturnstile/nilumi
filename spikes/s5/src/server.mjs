import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { pool } from "./db.mjs";

export function resumeCursor(value) {
  if (value === undefined || value === null || value === "") return 0;
  if (!/^\d{1,6}$/.test(String(value))) throw new Error("invalid_cursor");
  const cursor = Number(value);
  if (cursor > 10) throw new Error("invalid_cursor");
  return cursor;
}
function authorized(header, token) {
  const actual = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function createSmokeServer(db, token) {
  if (!token || token.length < 32) throw new Error("s5_token_required");
  return createServer(async (req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200).end("ok");
      return;
    }
    if (req.url === "/readyz") {
      try {
        if (db.s5Failed) throw new Error("s5_pool_failed");
        await db.query("select 1");
        res.writeHead(200).end("ready");
      } catch {
        res.writeHead(503).end("not_ready");
      }
      return;
    }
    if (!authorized(req.headers.authorization, token)) {
      res.writeHead(401).end();
      return;
    }
    if (
      !["/stream", "/stream/soak"].includes(req.url) ||
      req.method !== "POST"
    ) {
      res.writeHead(404).end();
      return;
    }
    req.resume();
    let cursor;
    try {
      cursor = resumeCursor(req.headers["last-event-id"]);
    } catch {
      res.writeHead(400).end();
      return;
    }
    // Fixed synthetic IDs only. No household content or arbitrary request body.
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.flushHeaders();
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25_000);
    const soak = req.url === "/stream/soak";
    const finish = soak ? setTimeout(() => res.end(), 55_000) : undefined;
    const events = setInterval(() => {
      if (soak) return;
      cursor++;
      res.write(
        `id: ${cursor}\nevent: invalidate\ndata: {"synthetic":true,"sequence":${cursor}}\n\n`,
      );
      if (cursor >= 10) {
        clearInterval(events);
        clearInterval(heartbeat);
        res.end();
      }
    }, 100);
    if (cursor === 10) {
      clearInterval(events);
      clearInterval(heartbeat);
      clearTimeout(finish);
      res.end();
    }
    res.on("close", () => {
      clearInterval(events);
      clearInterval(heartbeat);
      clearTimeout(finish);
    });
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = pool();
  const server = createSmokeServer(db, process.env.S5_SMOKE_TOKEN);
  server.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
  const stop = () => {
    server.close(() => db.end());
    server.closeAllConnections();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
