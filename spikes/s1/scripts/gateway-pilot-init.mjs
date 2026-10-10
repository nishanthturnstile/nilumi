import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { z } from "zod";
import {
  PILOT_NOTICE_VERSION,
  PILOT_PROCESSORS,
} from "../config/privacy-notice.ts";
import { PILOT_EVIDENCE_VERSION } from "../lib/gateway/pilot-store.ts";

const argument = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
try {
  if (!process.argv.includes("--apply")) {
    console.log(
      JSON.stringify({
        mode: "dry",
        databaseWrites: 0,
        evidenceVersion: PILOT_EVIDENCE_VERSION,
        acknowledgement: "explicit-owner-action-required",
      }),
    );
  } else {
    const config = z
      .object({
        ownerEmail: z.string().email(),
        adults: z.array(z.string().email()).length(2),
      })
      .strict()
      .parse(JSON.parse(await readFile(argument("config"), "utf8")));
    config.ownerEmail = config.ownerEmail.toLowerCase();
    config.adults = config.adults.map((x) => x.toLowerCase());
    if (
      new Set(config.adults).size !== 2 ||
      !config.adults.includes(config.ownerEmail)
    )
      throw Error("invalid household");
    const evidence = JSON.parse(await readFile(argument("evidence"), "utf8"));
    if (
      evidence.version !== "vgw-pilot-acceptance-v1" ||
      evidence.status !== "accepted-restricted-founding-pilot" ||
      evidence.quota?.failure?.httpStatus !== 402 ||
      evidence.quota?.failure?.providerCode !== "quota_for_entity_exceeded" ||
      evidence.shutdown?.httpStatus !== 401 ||
      evidence.shutdown?.previouslySucceeded !== true ||
      evidence.localControlsValidated !== true
    )
      throw Error("acceptance incomplete");
    const connectionString = process.env.GATEWAY_MIGRATION_DATABASE_URL;
    if (!connectionString) throw Error("owner connection required");
    const pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        await readFile(
          new URL("../sql/gateway-pilot.sql", import.meta.url),
          "utf8",
        ),
      );
      await client.query(
        "INSERT INTO gateway_pilot.household(id,owner_email,adults,notice_version,processors,evidence_version) VALUES('founding',$1,$2::jsonb,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING",
        [
          config.ownerEmail,
          JSON.stringify(config.adults),
          PILOT_NOTICE_VERSION,
          JSON.stringify(PILOT_PROCESSORS),
          PILOT_EVIDENCE_VERSION,
        ],
      );
      const h = (
        await client.query(
          "SELECT * FROM gateway_pilot.household WHERE id='founding' FOR UPDATE",
        )
      ).rows[0];
      if (
        h.owner_email !== config.ownerEmail ||
        JSON.stringify([...h.adults].sort()) !==
          JSON.stringify([...config.adults].sort())
      )
        throw Error("existing household differs; do not overwrite");
      await client.query(
        "UPDATE gateway_pilot.household SET evidence_version=$1 WHERE id='founding'",
        [PILOT_EVIDENCE_VERSION],
      );
      await client.query("COMMIT");
      console.log(
        JSON.stringify({
          status: "configured",
          evidenceVersion: PILOT_EVIDENCE_VERSION,
          acknowledgement: "not-recorded-by-this-command",
        }),
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }
} catch {
  console.error(
    "Pilot initialization refused. Verify the reviewed evidence, household config and migration-owner connection; existing state is preserved.",
  );
  process.exitCode = 1;
}
