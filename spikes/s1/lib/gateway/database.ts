import { Pool } from "pg";
import { VerificationError } from "../verification/ledger";

export type Sql = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
};
export type Database = {
  transaction<T>(work: (sql: Sql) => Promise<T>): Promise<T>;
};
let pool: Pool | null = null;
export function gatewayDatabase(): Database {
  const connectionString = process.env.GATEWAY_DATABASE_URL;
  if (!connectionString)
    throw new VerificationError("gateway_database_not_configured");
  pool ??= new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
  });
  return {
    async transaction(work) {
      const client = await (pool as Pool).connect();
      try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
