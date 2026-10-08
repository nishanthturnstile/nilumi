import { readFile } from "node:fs/promises";
import pg from "pg";

export const LOCAL_URL =
  "postgres://s5_owner:s5-local-synthetic-only@127.0.0.1:55435/s5_smoke";
export function databaseUrl(env = process.env) {
  const value = env.S5_DATABASE_URL ?? LOCAL_URL;
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.pathname !== "/s5_smoke"
  )
    throw new Error("s5_disposable_database_required");
  if (
    !["127.0.0.1", "localhost", "::1"].includes(url.hostname) &&
    env.S5_ALLOW_REMOTE !== "true"
  )
    throw new Error("s5_remote_database_not_enabled");
  return value;
}
export function pool(options = {}) {
  const result = new pg.Pool({
    connectionString: databaseUrl(),
    max: 2,
    connectionTimeoutMillis: 5000,
    ...options,
  });
  result.s5Failed = false;
  result.on("connect", (client) => {
    client.on("error", () => {
      result.s5Failed = true;
    });
  });
  result.on("error", () => {
    result.s5Failed = true;
  });
  return result;
}
export async function setup(owner) {
  const remote = !["127.0.0.1", "localhost", "[::1]"].includes(
    new URL(databaseUrl()).hostname,
  );
  const password =
    process.env.S5_APP_PASSWORD ??
    (remote ? undefined : "s5-local-synthetic-only");
  if (!password || password.length < 20)
    throw new Error("s5_app_password_required");
  const identity = await owner.query("select current_database() as name");
  if (identity.rows[0].name !== "s5_smoke")
    throw new Error("s5_disposable_database_required");
  await owner.query(
    await readFile(new URL("../sql/smoke.sql", import.meta.url), "utf8"),
  );
  const statement = await owner.query(
    "select format('ALTER ROLE s5_app PASSWORD %L', $1::text) as sql",
    [password],
  );
  await owner.query(statement.rows[0].sql);
}
export async function withMember(db, household, member, fn) {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query(
      "select set_config('s5.household', $1, true), set_config('s5.member', $2, true)",
      [household, member],
    );
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
