import { EventEmitter } from "node:events";
import { pathToFileURL } from "node:url";
import { Logger, run, runMigrations } from "graphile-worker";
import { pool } from "./db.mjs";

export const logger = new Logger(() => () => {});
export async function prepareWorker(db) {
  await runMigrations({ pgPool: db, logger });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = pool({ max: 6 });
  const runner = await startWorker(db);
  const stop = async () => {
    await runner.stop();
    await db.end();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}
export async function enqueue(client, id, revision, dueAt) {
  // Caller owns transaction: occurrence changes and enqueue commit together.
  await client.query(
    "select graphile_worker.add_job('s5_dispatch', $1::json, run_at := $2, job_key := $3, max_attempts := 3)",
    [JSON.stringify({ id, revision }), dueAt, `s5:${id}:${revision}`],
  );
}
export function startWorker(db, options = {}) {
  const events = options.events ?? new EventEmitter();
  const reported = new Set();
  for (const event of [
    "worker:getJob:error",
    "job:error",
    "worker:fatalError",
  ]) {
    events.on(event, ({ error }) => {
      const code = /^[A-Z0-9_]+$/.test(error?.code ?? "")
        ? error.code
        : "S5_WORKER_ERROR";
      if (!reported.has(`${event}:${code}`)) {
        reported.add(`${event}:${code}`);
        console.error(JSON.stringify({ event, code }));
      }
    });
  }
  return run({
    ...options,
    events,
    pgPool: db,
    concurrency: 4,
    pollInterval: 100,
    noHandleSignals: true,
    logger,
    taskList: {
      s5_dispatch: async (payload) => {
        if (
          !payload ||
          typeof payload.id !== "string" ||
          !Number.isInteger(payload.revision)
        )
          throw new Error("invalid_synthetic_job");
        const client = await db.connect();
        try {
          await client.query("begin");
          const claim = await client.query(
            "update s5.occurrences set status='dispatching' where id=$1 and revision=$2 and status='scheduled' and due_at<=clock_timestamp() returning id, household_id",
            [payload.id, payload.revision],
          );
          if (claim.rowCount) {
            await client.query(
              "insert into s5.deliveries(household_id, occurrence_id, revision) values($1,$2,$3) on conflict do nothing",
              [claim.rows[0].household_id, payload.id, payload.revision],
            );
            await client.query(
              "update s5.occurrences set status='sent' where id=$1 and revision=$2",
              [payload.id, payload.revision],
            );
          }
          await client.query("commit");
        } catch (error) {
          await client.query("rollback");
          throw error;
        } finally {
          client.release();
        }
      },
    },
  });
}
